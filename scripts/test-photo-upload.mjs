const baseUrl = process.env.TEST_BASE_URL;
if (!baseUrl) throw new Error("TEST_BASE_URL is required.");

function cookieFrom(response) {
  const cookie = response.headers.get("set-cookie");
  return cookie ? cookie.split(";")[0] : "";
}

const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ userId: "admin", password: "admin" }),
});
const cookie = cookieFrom(loginResponse);
console.log(`login_status=${loginResponse.status}`);
console.log(`session_cookie_present=${Boolean(cookie)}`);
if (!loginResponse.ok || !cookie) process.exit(1);

const samplesResponse = await fetch(`${baseUrl}/api/samples`, {
  headers: { cookie },
});
const samplesPayload = await samplesResponse.json();
const sample = samplesPayload.samples?.[0];
console.log(`samples_status=${samplesResponse.status}`);
console.log(`sample_selected=${Boolean(sample?.sampleId)}`);
if (!sample?.sampleId) process.exit(1);

const tinyJpeg = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
  0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01,
  0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff,
  0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xff, 0xd9,
]);

const formData = new FormData();
formData.append(
  "file",
  new Blob([tinyJpeg], { type: "image/jpeg" }),
  "dummy-photo-upload-test.jpg"
);
formData.append("sample_id", sample.sampleId);
formData.append("survey_month", "202606");
formData.append("active_tab", "farm-basic");
formData.append("survey_round_key", "farm_basic");
formData.append("photo_id", "photo_overview_1");
formData.append("captured_at", new Date().toISOString());

const uploadResponse = await fetch(`${baseUrl}/api/photos/upload`, {
  method: "POST",
  headers: { cookie },
  body: formData,
});
const uploadPayload = await uploadResponse.json().catch(() => ({}));
console.log(`upload_status=${uploadResponse.status}`);
console.log(`upload_result=${uploadPayload.status ?? ""}`);
console.log(`drive_file_id_present=${Boolean(uploadPayload.drive_file_id)}`);
console.log(`filename_present=${Boolean(uploadPayload.filename)}`);
console.log(`survey_label=${uploadPayload.survey_label ?? ""}`);
if (!uploadResponse.ok) {
  console.log(`upload_error=${uploadPayload.error ?? "unknown"}`);
  process.exit(1);
}

const adminResponse = await fetch(`${baseUrl}/api/admin/samples`, {
  headers: { cookie },
});
const adminPayload = await adminResponse.json().catch(() => ({}));
const adminSample = adminPayload.samples?.find(
  (item) => item.sampleId === sample.sampleId
);
console.log(`admin_samples_status=${adminResponse.status}`);
console.log(`admin_photo_status=${adminSample?.photoStatus ?? ""}`);
