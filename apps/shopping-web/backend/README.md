# Bagisto MVP Backend

Small PHP/MySQL API for the admin and mobile app MVP. It has no Composer dependencies.

## Requirements

- PHP with `pdo_mysql`
- MySQL 8 or MariaDB

## Setup

Create the database:

```powershell
mysql -u root -p < backend/schema.sql
```

Start the API:

```powershell
$env:DB_HOST="127.0.0.1"
$env:DB_PORT="3306"
$env:DB_DATABASE="bagisto_mvp"
$env:DB_USERNAME="root"
$env:DB_PASSWORD="your_mysql_password"
$env:OTP_SECRET="change-this-long-random-secret"
$env:OTP_DEV_MODE="true"

# Mobile OTP through MSG91.
$env:MSG91_AUTH_KEY="your_msg91_auth_key"
$env:MSG91_TEMPLATE_ID="your_msg91_otp_template_id"
$env:MSG91_SENDER_ID="optional_sender_id"

# Email OTP through EmailJS REST API. If these are not set, OTP_EMAIL_FROM
# is used with PHP mail(), which requires mail to be configured on the server.
$env:EMAILJS_SERVICE_ID="your_emailjs_service_id"
$env:EMAILJS_TEMPLATE_ID="your_emailjs_template_id"
$env:EMAILJS_PUBLIC_KEY="your_emailjs_public_key"
$env:EMAILJS_PRIVATE_KEY="optional_emailjs_private_key"
$env:OTP_EMAIL_FROM="orders@example.com"
php -S 127.0.0.1:8000 -t backend/public backend/public/index.php
```

Frontend env:

```powershell
$env:VITE_BAGISTO_API_URL="http://127.0.0.1:8000"
npm run dev
```

## Endpoints

- `GET /health`
- `GET /api/v1/products`
- `POST /api/v1/products`
- `PUT /api/v1/products/{id}`
- `DELETE /api/v1/products/{id}`
- `POST /api/v1/otp/send`
- `POST /api/v1/otp/verify`
- `POST /api/v1/checkout/save-order`

MSG91 requires an OTP template in the MSG91 dashboard. EmailJS requires a
template that accepts `to_email`, `otp`, `code`, or `message` template params.
When `OTP_DEV_MODE=true`, the API skips external OTP providers and returns a
`devCode` field in the `/api/v1/otp/send` JSON response for local testing.
