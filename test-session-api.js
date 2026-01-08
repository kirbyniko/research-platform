// Test the Descope session API
const testToken = "eyJhbGciOiJSUzI1NiIsImtpZCI6IlNLMzNhUW14cHBvdGMwdFFHcmViMHR0S3FoUnY4IiwidHlwIjoiSldUIn0.eyJhbXIiOlsib2F1dGgiXSwiZHJuIjoiRFMiLCJleHAiOjE3Njc4MzAxNjIsImlhdCI6MTc2NzgyOTU2MiwiaXNzIjoiUDMzYVFtbWg0cEFHUnRJMzNkWEJ3Z2JUR2h5USIsInJleHAiOiIyMDI2LTAyLTA0VDIzOjQ2OjAyWiIsInN1YiI6IlUzM2FWQ3pnRnlKWUQyY0dQeGliNUdmOTNDd3IifQ.q_7q8y1S5KJ4yGZe1HNY3p36JaiQMj-GgAR5K2nPIfSFw7cQYF0MZkguzIxr0I30jfFv8glf--ejAuFXS4gz2quk36pkMpkLvvubQslYdFsLQx0f7OXqFqTq9HzQ0ynI9BRNeFhu34m6-47x1x45RnvuITHmhttx0qjScrTT8c1wFSMizHxZzMrCQHIbjPKPesb8g-a5hxc9HU6X5ueY3zhKLpWgDSwq8Y7NPNteEbIccJLPlfahoipAAEC2ttPOflN8NDlcvHKsstmi5CygF1lNlFe89GJcZs9kU4UVgVtJexVZ_gZWsLyRVbxSgljAEHr0MABhUBm7AdIQmmRo0g";

fetch('http://localhost:3000/api/auth/descope/session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ sessionToken: testToken }),
})
  .then(res => {
    console.log('Response status:', res.status);
    return res.json();
  })
  .then(data => {
    console.log('Response data:', data);
  })
  .catch(err => {
    console.error('Error:', err.message);
  });
