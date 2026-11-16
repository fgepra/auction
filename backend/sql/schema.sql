-- 상상 경매 DB 스키마 (MySQL 8 / MariaDB 10.5 이상)
-- 모든 시각은 UTC(DATETIME(3))로 저장하고, 연결할 때 세션 시간대를 +00:00으로 맞춥니다.
-- 몽(가상 화폐)은 정수로만 다룹니다.

CREATE TABLE IF NOT EXISTS users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(254)    NOT NULL,
  nickname      VARCHAR(40)     NOT NULL,
  password_hash VARCHAR(100)    NOT NULL,
  -- 지금 쓸 수 있는 몽. 입찰하면 바로 빠지고(에스크로), 더 높은 입찰이 나오면 돌아옵니다.
  balance       BIGINT          NOT NULL DEFAULT 0,
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_nickname (nickname),
  CONSTRAINT chk_users_balance CHECK (balance >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS items (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  seller_id     BIGINT UNSIGNED NOT NULL,
  name          VARCHAR(60)     NOT NULL,
  tagline       VARCHAR(100)    NOT NULL DEFAULT '',
  features      TEXT            NOT NULL,            -- 기능 목록(JSON 배열 문자열)
  story         TEXT            NOT NULL,
  art           VARCHAR(20)     NOT NULL,            -- 기본 일러스트 종류
  start_price   BIGINT UNSIGNED NOT NULL,
  current_price BIGINT UNSIGNED NOT NULL,            -- 입찰이 없으면 시작가와 같음
  bid_count     INT UNSIGNED    NOT NULL DEFAULT 0,
  status        ENUM('active','sold','unsold') NOT NULL DEFAULT 'active',
  winner_id     BIGINT UNSIGNED NULL,
  ends_at       DATETIME(3)     NOT NULL,
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_items_status_ends (status, ends_at),
  KEY idx_items_seller (seller_id, created_at),
  KEY idx_items_winner (winner_id, status, ends_at),
  CONSTRAINT fk_items_seller FOREIGN KEY (seller_id) REFERENCES users (id),
  CONSTRAINT fk_items_winner FOREIGN KEY (winner_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bids (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id    BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  amount     BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  -- 한 물건에서 같은 금액이 두 번 들어갈 수 없게 하는 안전장치
  UNIQUE KEY uq_bids_item_amount (item_id, amount),
  KEY idx_bids_user_item (user_id, item_id),
  CONSTRAINT fk_bids_item FOREIGN KEY (item_id) REFERENCES items (id),
  CONSTRAINT fk_bids_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 몽이 움직인 기록. amount는 +면 들어온 몽, -면 나간 몽입니다.
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  type          ENUM('signup_bonus','bid_hold','bid_refund','sale') NOT NULL,
  amount        BIGINT          NOT NULL,
  balance_after BIGINT          NOT NULL,
  item_id       BIGINT UNSIGNED NULL,
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_wallet_user (user_id, id),
  CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_wallet_item FOREIGN KEY (item_id) REFERENCES items (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
