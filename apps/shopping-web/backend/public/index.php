<?php

declare(strict_types=1);

$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';

header('Access-Control-Allow-Origin: ' . $origin);
header('Vary: Origin');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function env_value(string $key, ?string $default = null): ?string
{
    $value = getenv($key);
    return $value === false ? $default : $value;
}

function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $host = env_value('DB_HOST', '127.0.0.1');
    $port = env_value('DB_PORT', '3306');
    $database = env_value('DB_DATABASE', 'bagisto_mvp');
    $username = env_value('DB_USERNAME', 'root');
    $password = env_value('DB_PASSWORD', '');

    $dsn = "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4";

    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    return $pdo;
}

function json_response(mixed $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES);
    exit;
}

function read_json(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        json_response(['message' => 'Invalid JSON body'], 422);
    }

    return $data;
}

function post_json(string $url, array $payload, array $headers = []): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers),
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_TIMEOUT => 15,
    ]);

    $body = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($body === false || $status >= 400) {
        $detail = $error !== '' ? $error : trim((string)$body);
        throw new RuntimeException($detail !== '' ? $detail : "HTTP {$status}");
    }

    $json = json_decode((string)$body, true);
    return is_array($json) ? $json : ['body' => $body, 'status' => $status];
}

function otp_hash(string $code): string
{
    return hash_hmac('sha256', $code, env_value('OTP_SECRET', 'bagisto-local-otp-secret'));
}

function otp_dev_mode(): bool
{
    return in_array(strtolower((string)env_value('OTP_DEV_MODE', 'false')), ['1', 'true', 'yes', 'local'], true);
}

function normalize_phone(string $phone): string
{
    $digits = preg_replace('/\D+/', '', $phone) ?? '';

    if (strlen($digits) === 10) {
        return '91' . $digits;
    }

    return $digits;
}

function send_mobile_otp(string $phone, string $code): void
{
    $authKey = env_value('MSG91_AUTH_KEY', '');
    $templateId = env_value('MSG91_TEMPLATE_ID', '');
    $senderId = env_value('MSG91_SENDER_ID', '');

    if ($authKey === '' || $templateId === '') {
        throw new RuntimeException('MSG91_AUTH_KEY and MSG91_TEMPLATE_ID are required for mobile OTP');
    }

    $query = http_build_query([
        'template_id' => $templateId,
        'mobile' => normalize_phone($phone),
        'authkey' => $authKey,
        'otp' => $code,
    ]);

    if ($senderId !== '') {
        $query .= '&' . http_build_query(['sender' => $senderId]);
    }

    post_json("https://control.msg91.com/api/v5/otp?{$query}", [
        'OTP' => $code,
    ]);
}

function send_email_otp(string $email, string $code): void
{
    $brevoKey = env_value('BREVO_API_KEY', '');
    $brevoSenderEmail = env_value('BREVO_SENDER_EMAIL', '');
    $brevoSenderName = env_value('BREVO_SENDER_NAME', 'Bagisto Store');

    if ($brevoKey !== '' && $brevoSenderEmail !== '') {
        post_json('https://api.brevo.com/v3/smtp/email', [
            'sender' => ['name' => $brevoSenderName, 'email' => $brevoSenderEmail],
            'to' => [['email' => $email]],
            'subject' => 'Your Bagisto verification code',
            'htmlContent' => "<p>Your Bagisto verification code is <strong>{$code}</strong>.</p><p>This code expires in 10 minutes.</p>",
            'textContent' => "Your Bagisto verification code is {$code}. This code expires in 10 minutes.",
        ], [
            'api-key: ' . $brevoKey,
        ]);
        return;
    }

    $serviceId = env_value('EMAILJS_SERVICE_ID', '');
    $templateId = env_value('EMAILJS_TEMPLATE_ID', '');
    $publicKey = env_value('EMAILJS_PUBLIC_KEY', '');
    $privateKey = env_value('EMAILJS_PRIVATE_KEY', '');

    if ($serviceId !== '' && $templateId !== '' && $publicKey !== '') {
        $payload = [
            'service_id' => $serviceId,
            'template_id' => $templateId,
            'user_id' => $publicKey,
            'template_params' => [
                'to_email' => $email,
                'user_email' => $email,
                'email' => $email,
                'to' => $email,
                'otp' => $code,
                'code' => $code,
                'message' => "Your verification code is {$code}",
            ],
        ];

        if ($privateKey !== '') {
            $payload['accessToken'] = $privateKey;
        }

        post_json('https://api.emailjs.com/api/v1.0/email/send', $payload);
        return;
    }

    $from = env_value('OTP_EMAIL_FROM', '');
    if ($from === '') {
        throw new RuntimeException('EMAILJS_* vars or OTP_EMAIL_FROM are required for email OTP');
    }

    $sent = mail($email, 'Your Bagisto verification code', "Your verification code is {$code}", "From: {$from}");
    if (!$sent) {
        throw new RuntimeException('Email OTP could not be sent');
    }
}

function product_payload(array $input): array
{
    $name = trim((string)($input['name'] ?? ''));

    if ($name === '') {
        json_response(['message' => 'Product name is required'], 422);
    }

    $sku = trim((string)($input['sku'] ?? ''));

    return [
        'sku' => $sku === '' ? null : $sku,
        'name' => $name,
        'category' => trim((string)($input['category'] ?? 'uncategorized')),
        'price' => (float)($input['price'] ?? 0),
        'original_price' => (float)($input['originalPrice'] ?? $input['original_price'] ?? $input['price'] ?? 0),
        'stock' => (int)($input['stock'] ?? 0),
        'image' => trim((string)($input['image'] ?? '')),
        'tag' => trim((string)($input['tag'] ?? 'new')),
        'rating' => (float)($input['rating'] ?? 0),
        'reviews' => (int)($input['reviews'] ?? 0),
        'description' => trim((string)($input['description'] ?? '')),
    ];
}

function normalize_product(array $row): array
{
    return [
        'id' => (int)$row['id'],
        'sku' => $row['sku'],
        'name' => $row['name'],
        'category' => $row['category'],
        'price' => (float)$row['price'],
        'originalPrice' => (float)$row['original_price'],
        'stock' => (int)$row['stock'],
        'image' => $row['image'],
        'tag' => $row['tag'],
        'rating' => (float)$row['rating'],
        'reviews' => (int)$row['reviews'],
        'description' => $row['description'],
    ];
}

function column_exists(string $table, string $column): bool
{
    $stmt = db()->prepare("
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
    ");
    $stmt->execute([$table, $column]);
    return (int)$stmt->fetchColumn() > 0;
}

function ensure_schema(): void
{
    db()->exec("
        CREATE TABLE IF NOT EXISTS products (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            sku VARCHAR(80) NULL,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(120) NOT NULL DEFAULT 'uncategorized',
            price DECIMAL(12,2) NOT NULL DEFAULT 0,
            original_price DECIMAL(12,2) NOT NULL DEFAULT 0,
            stock INT NOT NULL DEFAULT 0,
            image VARCHAR(500) NULL,
            tag VARCHAR(60) NOT NULL DEFAULT 'new',
            rating DECIMAL(3,2) NOT NULL DEFAULT 0,
            reviews INT NOT NULL DEFAULT 0,
            description TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY products_sku_unique (sku)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    db()->exec("
        CREATE TABLE IF NOT EXISTS orders (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            order_number VARCHAR(40) NOT NULL,
            payment_method VARCHAR(60) NOT NULL,
            total DECIMAL(12,2) NOT NULL DEFAULT 0,
            status VARCHAR(60) NOT NULL DEFAULT 'Processing',
            customer_name VARCHAR(255) NULL,
            customer_email VARCHAR(255) NULL,
            customer_phone VARCHAR(50) NULL,
            delivery_address TEXT NULL,
            items_json JSON NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    db()->exec("
        CREATE TABLE IF NOT EXISTS otp_codes (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            type VARCHAR(20) NOT NULL,
            target VARCHAR(255) NOT NULL,
            code_hash VARCHAR(128) NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            verified_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX otp_target_index (type, target)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $orderColumns = [
        'customer_name' => "ALTER TABLE orders ADD COLUMN customer_name VARCHAR(255) NULL AFTER status",
        'customer_email' => "ALTER TABLE orders ADD COLUMN customer_email VARCHAR(255) NULL AFTER customer_name",
        'customer_phone' => "ALTER TABLE orders ADD COLUMN customer_phone VARCHAR(50) NULL AFTER customer_email",
        'delivery_address' => "ALTER TABLE orders ADD COLUMN delivery_address TEXT NULL AFTER customer_phone",
    ];

    foreach ($orderColumns as $column => $statement) {
        if (!column_exists('orders', $column)) {
            db()->exec($statement);
        }
    }
}

function normalize_order(array $row): array
{
    $items = json_decode((string)$row['items_json'], true);

    return [
        'id' => (int)$row['id'],
        'orderNumber' => $row['order_number'],
        'paymentMethod' => $row['payment_method'],
        'total' => (float)$row['total'],
        'status' => $row['status'],
        'customerName' => $row['customer_name'] ?? '',
        'customerEmail' => $row['customer_email'] ?? '',
        'customerPhone' => $row['customer_phone'] ?? '',
        'deliveryAddress' => $row['delivery_address'] ?? '',
        'items' => is_array($items) ? $items : [],
        'createdAt' => $row['created_at'],
    ];
}

function seed_products(): void
{
    $count = (int)db()->query('SELECT COUNT(*) FROM products')->fetchColumn();
    if ($count > 0) {
        return;
    }

    $products = [
        ['HB-1001', 'Heritage Leather Bag', 'bags', 4299, 5999, 22, 'Bag', 'bestseller', 4.8, 142],
        ['MW-2040', 'Minimal Watch Pro', 'accessories', 12999, 16999, 8, 'Watch', 'new', 4.9, 89],
        ['SB-3102', 'Suede Ankle Boots', 'footwear', 3499, 4500, 14, 'Boots', 'sale', 4.6, 211],
        ['SW-4401', 'Silk Wrap Dress', 'clothing', 2899, 3800, 5, 'Dress', 'trending', 4.7, 178],
    ];

    $stmt = db()->prepare('
        INSERT INTO products (sku, name, category, price, original_price, stock, image, tag, rating, reviews)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');

    foreach ($products as $product) {
        $stmt->execute($product);
    }
}

try {
    ensure_schema();
    seed_products();

    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($path === '/health') {
        json_response(['ok' => true, 'service' => 'bagisto-mvp-api']);
    }

    if ($path === '/') {
        json_response([
            'ok' => true,
            'service' => 'bagisto-mvp-api',
            'endpoints' => ['/health', '/api/v1/products', '/api/v1/orders'],
        ]);
    }

    if ($path === '/api/v1/otp/send' && $method === 'POST') {
        $input = read_json();
        $type = trim((string)($input['type'] ?? ''));
        $target = trim((string)($input['target'] ?? ''));

        if (!in_array($type, ['phone', 'email'], true) || $target === '') {
            json_response(['message' => 'OTP type and target are required'], 422);
        }

        if ($type === 'email' && !filter_var($target, FILTER_VALIDATE_EMAIL)) {
            json_response(['message' => 'Valid email is required'], 422);
        }

        if ($type === 'phone' && strlen(normalize_phone($target)) < 10) {
            json_response(['message' => 'Valid phone number is required'], 422);
        }

        $code = (string)random_int(100000, 999999);
        $devMode = otp_dev_mode();

        if ($type === 'phone') {
            if (!$devMode) {
                send_mobile_otp($target, $code);
            }
            $target = normalize_phone($target);
        } else {
            if (!$devMode) {
                send_email_otp($target, $code);
            }
            $target = strtolower($target);
        }

        $stmt = db()->prepare('
            INSERT INTO otp_codes (type, target, code_hash, expires_at)
            VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))
        ');
        $stmt->execute([$type, $target, otp_hash($code)]);

        $response = ['sent' => true, 'expiresInMinutes' => 10];
        if ($devMode) {
            $response['devCode'] = $code;
        }

        json_response($response);
    }

    if ($path === '/api/v1/otp/verify' && $method === 'POST') {
        $input = read_json();
        $type = trim((string)($input['type'] ?? ''));
        $target = trim((string)($input['target'] ?? ''));
        $code = trim((string)($input['code'] ?? ''));

        if (!in_array($type, ['phone', 'email'], true) || $target === '' || $code === '') {
            json_response(['message' => 'OTP type, target, and code are required'], 422);
        }

        $target = $type === 'phone' ? normalize_phone($target) : strtolower($target);

        $stmt = db()->prepare('
            SELECT id, code_hash
            FROM otp_codes
            WHERE type = ? AND target = ? AND expires_at > NOW() AND verified_at IS NULL
            ORDER BY id DESC
            LIMIT 1
        ');
        $stmt->execute([$type, $target]);
        $row = $stmt->fetch();

        if (!$row || !hash_equals((string)$row['code_hash'], otp_hash($code))) {
            json_response(['message' => 'Invalid or expired OTP'], 422);
        }

        $update = db()->prepare('UPDATE otp_codes SET verified_at = NOW() WHERE id = ?');
        $update->execute([(int)$row['id']]);

        json_response(['verified' => true]);
    }

    if (in_array($path, ['/api/v1/products', '/api/products', '/api/v1/shop/products'], true) && $method === 'GET') {
        $stmt = db()->query('SELECT * FROM products ORDER BY id DESC');
        $products = array_map('normalize_product', $stmt->fetchAll());
        json_response(['data' => $products]);
    }

    if (in_array($path, ['/api/v1/products', '/api/products'], true) && $method === 'POST') {
        $payload = product_payload(read_json());

        $stmt = db()->prepare('
            INSERT INTO products (sku, name, category, price, original_price, stock, image, tag, rating, reviews, description)
            VALUES (:sku, :name, :category, :price, :original_price, :stock, :image, :tag, :rating, :reviews, :description)
        ');
        $stmt->execute($payload);

        $product = db()->prepare('SELECT * FROM products WHERE id = ?');
        $product->execute([db()->lastInsertId()]);

        json_response(['data' => normalize_product($product->fetch())], 201);
    }

    if (preg_match('#^/api/v1/products/(\d+)$#', $path, $matches) && in_array($method, ['PUT', 'PATCH'], true)) {
        $id = (int)$matches[1];
        $payload = product_payload(read_json());

        $stmt = db()->prepare('
            UPDATE products
            SET sku = :sku, name = :name, category = :category, price = :price, original_price = :original_price,
                stock = :stock, image = :image, tag = :tag, rating = :rating, reviews = :reviews, description = :description
            WHERE id = :id
        ');
        $stmt->execute([...$payload, 'id' => $id]);

        $product = db()->prepare('SELECT * FROM products WHERE id = ?');
        $product->execute([$id]);
        $row = $product->fetch();

        if (!$row) {
            json_response(['message' => 'Product not found'], 404);
        }

        json_response(['data' => normalize_product($row)]);
    }

    if (preg_match('#^/api/v1/products/(\d+)$#', $path, $matches) && $method === 'DELETE') {
        $stmt = db()->prepare('DELETE FROM products WHERE id = ?');
        $stmt->execute([(int)$matches[1]]);
        json_response(['deleted' => true]);
    }

    if ($path === '/api/v1/orders' && $method === 'GET') {
        $stmt = db()->query('SELECT * FROM orders ORDER BY id DESC');
        json_response(['data' => array_map('normalize_order', $stmt->fetchAll())]);
    }

    if (preg_match('#^/api/v1/orders/(\d+)$#', $path, $matches) && in_array($method, ['PUT', 'PATCH'], true)) {
        $input = read_json();
        $status = trim((string)($input['status'] ?? ''));

        if ($status === '') {
            json_response(['message' => 'Order status is required'], 422);
        }

        $stmt = db()->prepare('UPDATE orders SET status = ? WHERE id = ?');
        $stmt->execute([$status, (int)$matches[1]]);

        $order = db()->prepare('SELECT * FROM orders WHERE id = ?');
        $order->execute([(int)$matches[1]]);
        $row = $order->fetch();

        if (!$row) {
            json_response(['message' => 'Order not found'], 404);
        }

        json_response(['data' => normalize_order($row)]);
    }

    if ($path === '/api/v1/checkout/save-order' && $method === 'POST') {
        $input = read_json();
        $items = is_array($input['items'] ?? null) ? $input['items'] : [];
        $paymentMethod = (string)($input['payment']['method'] ?? 'unknown');
        $customer = is_array($input['customer'] ?? null) ? $input['customer'] : [];
        $delivery = is_array($input['delivery'] ?? null) ? $input['delivery'] : [];
        $orderNumber = 'BG-' . random_int(10000, 99999);

        $total = 0;
        $storedItems = [];
        foreach ($items as $item) {
            $productId = (int)($item['product_id'] ?? 0);
            $qty = max(1, (int)($item['quantity'] ?? 1));
            $stmt = db()->prepare('SELECT id, sku, name, price, stock FROM products WHERE id = ?');
            $stmt->execute([$productId]);
            $product = $stmt->fetch();
            if (!$product) {
                continue;
            }

            $price = (float)$product['price'];
            $total += $price * $qty;
            $storedItems[] = [
                'product_id' => (int)$product['id'],
                'sku' => $product['sku'],
                'name' => $product['name'],
                'quantity' => $qty,
                'price' => $price,
            ];

            $stockStmt = db()->prepare('UPDATE products SET stock = GREATEST(stock - ?, 0) WHERE id = ?');
            $stockStmt->execute([$qty, $productId]);
        }

        $stmt = db()->prepare('
            INSERT INTO orders (order_number, payment_method, total, status, customer_name, customer_email, customer_phone, delivery_address, items_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $orderNumber,
            $paymentMethod,
            $total,
            'Processing',
            trim((string)($customer['name'] ?? 'Guest customer')),
            trim((string)($customer['email'] ?? '')),
            trim((string)($customer['phone'] ?? '')),
            trim((string)($delivery['address'] ?? '')),
            json_encode($storedItems),
        ]);

        json_response([
            'data' => [
                'id' => (int)db()->lastInsertId(),
                'orderNumber' => $orderNumber,
                'total' => $total,
                'status' => 'Processing',
                'customerName' => trim((string)($customer['name'] ?? 'Guest customer')),
                'items' => $storedItems,
            ],
        ], 201);
    }

    json_response(['message' => 'Route not found'], 404);
} catch (Throwable $error) {
    json_response([
        'message' => 'Server error',
        'error' => $error->getMessage(),
    ], 500);
}
