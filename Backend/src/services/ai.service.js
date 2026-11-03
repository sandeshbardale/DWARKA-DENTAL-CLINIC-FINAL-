/**
 * AI X-Ray Analysis Service
 *
 * Sends the uploaded X-ray image to the ML FastAPI service (ML_SERVICE_URL).
 * If the ML service is unavailable, returns an honest error — NEVER a fake result.
 *
 * Architecture:
 *   React → Node/Express → FastAPI (Python/PyTorch) → prediction → Supabase
 */
const { aiReportDb, fileDb, patientDb, clinicDb } = require('../db')
const ApiError = require('../utils/ApiError')
const path = require('path')
const fs = require('fs')
const axios = require('axios')
const FormData = require('form-data')

/** Directory where uploaded X-ray images are stored. */
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000'

/**
 * Call the FastAPI ML service with the uploaded image.
 * Returns null if the service is unavailable (never returns fake data).
 *
 * @param {string} imagePath  Absolute path to uploaded image file
 * @returns {Promise<{ result: string, confidence: number, suggestions: string[], modelVersion: string }|null>}
 */
async function callMlService(imagePath) {
  try {
    const form = new FormData()
    form.append('file', fs.createReadStream(imagePath))

    const response = await axios.post(`${ML_SERVICE_URL}/predict`, form, {
      headers: form.getHeaders(),
      timeout: 60000, // 60 second timeout — inference can be slow on CPU
      maxContentLength: 30 * 1024 * 1024, // 30 MB (annotated image in base64)
      maxBodyLength: 30 * 1024 * 1024,
    })

    const data = response.data
    if (!data || !data.result) {
      throw new Error('Invalid response from ML service.')
    }

    return {
      result: data.result,        // 'cavity' | 'findings_detected' | 'normal'
      confidence: parseFloat(data.confidence) || 0,
      suggestions: Array.isArray(data.suggestions) ? data.suggestions : [data.suggestions || ''],
      modelVersion: data.modelVersion || 'yolo11m-dental-v1',
      // Rich YOLO fields
      findings: Array.isArray(data.findings) ? data.findings : [],
      count: typeof data.count === 'number' ? data.count : 0,
      summary: data.summary || '',
      annotatedImage: data.annotatedImage || null, // base64 PNG string or null
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.response?.status >= 500) {
      console.warn('[AI] ML service unavailable:', err.message)
      return null // Callers must handle null — never fake the result
    }
    // Propagate unexpected errors
    throw ApiError.internal(`ML service error: ${err.message}`)
  }
}

/**
 * Upload an X-ray, call the ML service, and persist an AiReport.
 * Throws ApiError if ML service is unavailable.
 *
 * @param {object} file       Multer file object (req.file)
 * @param {string} patientId  Patient UUID
 * @param {object} requestingUser  { id, role, email } from JWT
 */
async function uploadAndAnalyzeXray(file, patientId, requestingUser) {
  const clinic = await clinicDb.getDefaultClinic()

  const patient = await patientDb.findById(patientId)
  if (!patient || patient.is_deleted) throw ApiError.notFound('Patient not found.')

  const absoluteImagePath = file.path

  // ── Call real ML service ─────────────────────────────────────────────────
  const aiResult = await callMlService(absoluteImagePath)

  if (!aiResult) {
    // Clean up uploaded file if ML is down so storage doesn't accumulate
    throw ApiError.internal(
      'AI service is currently unavailable. Please try again later or contact the system administrator.'
    )
  }

  // ── Persist file metadata ────────────────────────────────────────────────
  const fileDoc = await fileDb.create({
    clinic_id: clinic.id,
    patient_id: patient.id,
    uploaded_by_id: requestingUser ? requestingUser.id : clinic.id,
    file_type: 'xray',
    storage_key: file.filename,
    original_name: file.originalname,
    mime_type: file.mimetype,
    size_bytes: file.size,
    uploaded_at: new Date().toISOString(),
  })

  // ── Persist AI report ────────────────────────────────────────────────────
  // Normalise result: the ML service returns 'cavity' | 'findings_detected' | 'normal'
  // The DB enum only has 'cavity' | 'normal' | 'uncertain' — map accordingly.
  let resultNormalized
  if (aiResult.result === 'cavity') {
    resultNormalized = 'cavity'
  } else if (aiResult.result === 'normal') {
    resultNormalized = 'normal'
  } else {
    // 'findings_detected' or anything else → treat as 'uncertain'
    resultNormalized = 'uncertain'
  }

  const report = await aiReportDb.create({
    clinic_id: clinic.id,
    patient_id: patient.id,
    file_id: fileDoc.id,
    result: resultNormalized,
    suggestions: aiResult.suggestions,
    confidence: parseFloat(aiResult.confidence.toFixed(4)),
    model_version: aiResult.modelVersion,
    findings: aiResult.findings,
    summary: aiResult.summary,
    finding_count: aiResult.count,
    annotated_image: aiResult.annotatedImage || null,
  })

  return {
    id: report.id,
    patientId: patientId,
    image: `/uploads/${file.filename}`,
    result: resultNormalized,
    confidence: report.confidence,
    suggestions: aiResult.suggestions,
    modelVersion: aiResult.modelVersion,
    findings: aiResult.findings,
    count: aiResult.count,
    summary: aiResult.summary,
    annotatedImage: aiResult.annotatedImage || null,
    date: new Date().toISOString().split('T')[0],
    doctorReview: null,
    doctorNotes: null,
  }
}

/**
 * Fetch all AI reports for a patient, newest first.
 */
async function getAiReportsByPatient(patientId) {
  const reports = await aiReportDb.findByPatient(patientId)

  return reports.map((r) => ({
    id: r.id,
    patientId: r.patient_id,
    image: r.file ? `/uploads/${r.file.storage_key}` : null,
    result: r.result,
    confidence: r.confidence,
    suggestions: Array.isArray(r.suggestions) ? r.suggestions : [r.suggestions],
    modelVersion: r.model_version || 'yolo11m-dental-v1',
    findings: Array.isArray(r.findings) ? r.findings : [],
    count: r.finding_count || 0,
    summary: r.summary || '',
    annotatedImage: r.annotated_image || null,
    date: r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : null,
    doctorReview: r.doctor_review || null,
    doctorNotes: r.doctor_notes || null,
  }))
}

/**
 * Doctor reviews an AI report — confirm or reject finding, add notes.
 * @param {string} reportId
 * @param {object} body  { doctorReview: 'confirmed'|'rejected', doctorNotes }
 */
async function reviewAiReport(reportId, body, requestingUser) {
  const updated = await aiReportDb.update(reportId, {
    doctor_review: body.doctorReview,
    doctor_notes: body.doctorNotes || '',
    reviewed_at: new Date().toISOString(),
    reviewed_by_id: requestingUser?.id || null,
  })

  if (!updated) throw ApiError.notFound('AI report not found.')

  return {
    id: updated.id,
    doctorReview: updated.doctor_review,
    doctorNotes: updated.doctor_notes,
    reviewedAt: updated.reviewed_at,
  }
}

module.exports = { uploadAndAnalyzeXray, getAiReportsByPatient, reviewAiReport, UPLOAD_DIR }
