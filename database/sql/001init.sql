-- =====================================================================
-- SentinelPay: database initialisation script
-- Requires MySQL 8.0.16+ (CHECK constraints are enforced from 8.0.16).
-- Run with:   mysql -u root -p < sentinelpay_init.sql
-- Sections:   1 database | 2 tables | 3 triggers | 4 views
--             5 posting procedure | 6 reference data | 7 privileges
--             8 demo data and checks (optional, delete before real use)
-- Money is DECIMAL(15,2). Balances are never stored; they are derived
-- from ledger_entries (credit increases a wallet, debit decreases it).
-- =====================================================================

-- DROP DATABASE IF EXISTS sentinelpay;   -- uncomment to start from scratch
CREATE DATABASE IF NOT EXISTS sentinelpay;
USE sentinelpay;

-- =====================================================================
-- 2. TABLES (created in dependency order; every FK uses the default
--    RESTRICT so nothing financial can be deleted by cascade)
-- =====================================================================

-- ---- 2.1 Identity and access ----------------------------------------
CREATE TABLE roles (
  role_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_name  VARCHAR(30)  NOT NULL,
  PRIMARY KEY (role_id),
  UNIQUE KEY uq_roles_name (role_name)
) ENGINE=InnoDB;

CREATE TABLE app_users (
  user_id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  phone          VARCHAR(11)  NOT NULL,
  email          VARCHAR(120) NULL,
  password_hash  VARCHAR(255) NOT NULL,
  status         ENUM('ACTIVE','LOCKED','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at  DATETIME     NULL,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_phone (phone),
  UNIQUE KEY uq_users_email (email),
  CONSTRAINT chk_users_phone CHECK (phone REGEXP '^01[3-9][0-9]{8}$')
) ENGINE=InnoDB;

-- Junction table for the M:N relationship has_role
CREATE TABLE user_roles (
  user_id  INT UNSIGNED NOT NULL,
  role_id  INT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES app_users (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles (role_id)     ON DELETE CASCADE
) ENGINE=InnoDB;

-- Supertype: every customer or agent. Staff users have no holder row.
CREATE TABLE account_holders (
  holder_id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED NOT NULL,
  holder_type    ENUM('CUSTOMER','AGENT') NOT NULL,
  full_name      VARCHAR(100) NOT NULL,
  date_of_birth  DATE         NOT NULL,
  address        VARCHAR(255) NOT NULL,
  kyc_status     ENUM('UNVERIFIED','VERIFIED','REJECTED') NOT NULL DEFAULT 'UNVERIFIED',
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (holder_id),
  UNIQUE KEY uq_holders_user (user_id),
  CONSTRAINT fk_holders_user FOREIGN KEY (user_id) REFERENCES app_users (user_id)
) ENGINE=InnoDB;

-- Subtype (ISA): shares its primary key with account_holders
CREATE TABLE agent_profiles (
  holder_id        INT UNSIGNED NOT NULL,
  agent_code       VARCHAR(20)  NOT NULL,
  outlet_name      VARCHAR(100) NOT NULL,
  district         VARCHAR(50)  NOT NULL,
  commission_rate  DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
  PRIMARY KEY (holder_id),
  UNIQUE KEY uq_agent_code (agent_code),
  CONSTRAINT fk_agent_holder FOREIGN KEY (holder_id) REFERENCES account_holders (holder_id),
  CONSTRAINT chk_agent_commission CHECK (commission_rate BETWEEN 0 AND 1)
) ENGINE=InnoDB;

-- ---- 2.2 Wallets -------------------------------------------------------
CREATE TABLE wallet_types (
  wallet_type_id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code                 VARCHAR(30)  NOT NULL,
  name                 VARCHAR(60)  NOT NULL,
  allowed_holder_type  ENUM('CUSTOMER','AGENT') NOT NULL,
  PRIMARY KEY (wallet_type_id),
  UNIQUE KEY uq_wallet_types_code (code)
) ENGINE=InnoDB;

CREATE TABLE wallets (
  wallet_id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  holder_id       INT UNSIGNED NOT NULL,
  wallet_type_id  INT UNSIGNED NOT NULL,
  wallet_no       VARCHAR(20)  NOT NULL,
  label           VARCHAR(50)  NOT NULL DEFAULT 'Main',
  status          ENUM('ACTIVE','FROZEN','CLOSED') NOT NULL DEFAULT 'ACTIVE',
  opened_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at       DATETIME     NULL,
  PRIMARY KEY (wallet_id),
  UNIQUE KEY uq_wallets_no (wallet_no),
  KEY idx_wallets_holder (holder_id),
  CONSTRAINT fk_wallets_holder FOREIGN KEY (holder_id)      REFERENCES account_holders (holder_id),
  CONSTRAINT fk_wallets_type   FOREIGN KEY (wallet_type_id) REFERENCES wallet_types (wallet_type_id),
  CONSTRAINT chk_wallets_closed CHECK (closed_at IS NULL OR closed_at >= opened_at)
) ENGINE=InnoDB;

-- Weak entity: identified by wallet + limit type + start date
CREATE TABLE wallet_limits (
  wallet_id       INT UNSIGNED NOT NULL,
  limit_type      ENUM('PER_TXN','DAILY','MONTHLY') NOT NULL,
  effective_from  DATE         NOT NULL,
  max_amount      DECIMAL(15,2) NOT NULL,
  effective_to    DATE         NULL,
  PRIMARY KEY (wallet_id, limit_type, effective_from),
  CONSTRAINT fk_limits_wallet FOREIGN KEY (wallet_id) REFERENCES wallets (wallet_id),
  CONSTRAINT chk_limits_amount CHECK (max_amount > 0),
  CONSTRAINT chk_limits_dates  CHECK (effective_to IS NULL OR effective_to > effective_from)
) ENGINE=InnoDB;

CREATE TABLE beneficiaries (
  beneficiary_id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_holder_id     INT UNSIGNED NOT NULL,
  beneficiary_wallet_id INT UNSIGNED NOT NULL,
  nickname            VARCHAR(50)  NOT NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (beneficiary_id),
  UNIQUE KEY uq_beneficiary (owner_holder_id, beneficiary_wallet_id),
  CONSTRAINT fk_ben_owner  FOREIGN KEY (owner_holder_id)       REFERENCES account_holders (holder_id),
  CONSTRAINT fk_ben_wallet FOREIGN KEY (beneficiary_wallet_id) REFERENCES wallets (wallet_id)
) ENGINE=InnoDB;

-- ---- 2.3 Transactions (the business-level record of every attempt) ----
CREATE TABLE transaction_types (
  type_id  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code     VARCHAR(30)  NOT NULL,
  name     VARCHAR(60)  NOT NULL,
  PRIMARY KEY (type_id),
  UNIQUE KEY uq_txn_types_code (code)
) ENGINE=InnoDB;

CREATE TABLE transactions (
  transaction_id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference_no              VARCHAR(40)  NOT NULL,
  type_id                   INT UNSIGNED NOT NULL,
  initiated_by_user_id      INT UNSIGNED NOT NULL,
  idempotency_key           VARCHAR(64)  NOT NULL,
  status                    ENUM('INITIATED','COMPLETED','FAILED','REVERSED') NOT NULL DEFAULT 'INITIATED',
  amount                    DECIMAL(15,2) NOT NULL,
  fee_amount                DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  failure_reason            VARCHAR(255) NULL,
  reversal_of_transaction_id BIGINT UNSIGNED NULL,
  created_at                DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at              DATETIME     NULL,
  PRIMARY KEY (transaction_id),
  UNIQUE KEY uq_txn_reference (reference_no),
  UNIQUE KEY uq_txn_idempotency (initiated_by_user_id, idempotency_key),
  UNIQUE KEY uq_txn_reversal (reversal_of_transaction_id),   -- a transaction is reversed at most once
  KEY idx_txn_status_completed (status, completed_at),
  CONSTRAINT fk_txn_type      FOREIGN KEY (type_id) REFERENCES transaction_types (type_id),
  CONSTRAINT fk_txn_user      FOREIGN KEY (initiated_by_user_id) REFERENCES app_users (user_id),
  CONSTRAINT fk_txn_reversal  FOREIGN KEY (reversal_of_transaction_id) REFERENCES transactions (transaction_id),
  CONSTRAINT chk_txn_amount   CHECK (amount > 0),
  CONSTRAINT chk_txn_fee      CHECK (fee_amount >= 0),
  CONSTRAINT chk_txn_failed   CHECK (status <> 'FAILED' OR failure_reason IS NOT NULL)
) ENGINE=InnoDB;

-- ---- 2.4 Ledger ---------------------------------------------------------
-- One ledger account per wallet (created by trigger) plus system accounts.
CREATE TABLE ledger_accounts (
  ledger_account_id  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  account_kind       ENUM('WALLET','SYSTEM') NOT NULL,
  wallet_id          INT UNSIGNED NULL,
  system_code        VARCHAR(30)  NULL,
  name               VARCHAR(100) NOT NULL,
  allow_negative     TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (ledger_account_id),
  UNIQUE KEY uq_ledger_wallet (wallet_id),
  UNIQUE KEY uq_ledger_system (system_code),
  CONSTRAINT fk_ledger_wallet FOREIGN KEY (wallet_id) REFERENCES wallets (wallet_id),
  CONSTRAINT chk_ledger_kind CHECK (
       (account_kind = 'WALLET' AND wallet_id IS NOT NULL AND system_code IS NULL)
    OR (account_kind = 'SYSTEM' AND wallet_id IS NULL     AND system_code IS NOT NULL))
) ENGINE=InnoDB;

-- One journal per transaction that actually moved money
CREATE TABLE ledger_journals (
  journal_id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  transaction_id  BIGINT UNSIGNED NOT NULL,
  status          ENUM('PENDING','POSTED') NOT NULL DEFAULT 'PENDING',
  posted_at       DATETIME     NULL,
  description     VARCHAR(255) NOT NULL,
  PRIMARY KEY (journal_id),
  UNIQUE KEY uq_journal_txn (transaction_id),
  CONSTRAINT fk_journal_txn FOREIGN KEY (transaction_id) REFERENCES transactions (transaction_id),
  CONSTRAINT chk_journal_posted CHECK (
       (status = 'POSTED'  AND posted_at IS NOT NULL)
    OR (status = 'PENDING' AND posted_at IS NULL))
) ENGINE=InnoDB;

-- Immutable debit/credit lines (see triggers in section 3)
CREATE TABLE ledger_entries (
  entry_id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  journal_id         BIGINT UNSIGNED NOT NULL,
  ledger_account_id  INT UNSIGNED NOT NULL,
  side               ENUM('DEBIT','CREDIT') NOT NULL,
  amount             DECIMAL(15,2) NOT NULL,
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (entry_id),
  KEY idx_entries_account (ledger_account_id, entry_id),
  KEY idx_entries_journal (journal_id),
  CONSTRAINT fk_entries_journal FOREIGN KEY (journal_id)        REFERENCES ledger_journals (journal_id),
  CONSTRAINT fk_entries_account FOREIGN KEY (ledger_account_id) REFERENCES ledger_accounts (ledger_account_id),
  CONSTRAINT chk_entries_amount CHECK (amount > 0)
) ENGINE=InnoDB;

-- Weak entity: who sent to whom (parties are ledger accounts, so
-- system accounts such as SETTLEMENT can take part)
CREATE TABLE transfer_details (
  transaction_id          BIGINT UNSIGNED NOT NULL,
  source_account_id       INT UNSIGNED NOT NULL,
  destination_account_id  INT UNSIGNED NOT NULL,
  note                    VARCHAR(255) NULL,
  PRIMARY KEY (transaction_id),
  KEY idx_td_source (source_account_id),
  KEY idx_td_dest (destination_account_id),
  CONSTRAINT fk_td_txn    FOREIGN KEY (transaction_id)         REFERENCES transactions (transaction_id),
  CONSTRAINT fk_td_source FOREIGN KEY (source_account_id)      REFERENCES ledger_accounts (ledger_account_id),
  CONSTRAINT fk_td_dest   FOREIGN KEY (destination_account_id) REFERENCES ledger_accounts (ledger_account_id),
  CONSTRAINT chk_td_parties CHECK (source_account_id <> destination_account_id)
) ENGINE=InnoDB;

CREATE TABLE transaction_status_history (
  history_id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  transaction_id  BIGINT UNSIGNED NOT NULL,
  from_status     VARCHAR(20)  NULL,
  to_status       VARCHAR(20)  NOT NULL,
  changed_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reason          VARCHAR(255) NULL,
  PRIMARY KEY (history_id),
  KEY idx_hist_txn (transaction_id, changed_at),
  CONSTRAINT fk_hist_txn FOREIGN KEY (transaction_id) REFERENCES transactions (transaction_id)
) ENGINE=InnoDB;

CREATE TABLE fee_rules (
  fee_rule_id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  type_id         INT UNSIGNED NOT NULL,
  min_amount      DECIMAL(15,2) NOT NULL,
  max_amount      DECIMAL(15,2) NOT NULL,
  fee_flat        DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  fee_percent     DECIMAL(6,5)  NOT NULL DEFAULT 0.00000,   -- 0.01850 = 1.85 %
  effective_from  DATE         NOT NULL,
  effective_to    DATE         NULL,
  PRIMARY KEY (fee_rule_id),
  KEY idx_fee_type (type_id, effective_from),
  CONSTRAINT fk_fee_type FOREIGN KEY (type_id) REFERENCES transaction_types (type_id),
  CONSTRAINT chk_fee_range CHECK (min_amount >= 0 AND max_amount >= min_amount),
  CONSTRAINT chk_fee_values CHECK (fee_flat >= 0 AND fee_percent >= 0),
  CONSTRAINT chk_fee_dates CHECK (effective_to IS NULL OR effective_to > effective_from)
) ENGINE=InnoDB;

-- ---- 2.5 Fraud detection -------------------------------------------------
CREATE TABLE risk_rules (
  rule_id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  rule_code    VARCHAR(30)  NOT NULL,
  description  VARCHAR(255) NOT NULL,
  severity     ENUM('LOW','MEDIUM','HIGH') NOT NULL,
  is_active    TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (rule_id),
  UNIQUE KEY uq_rules_code (rule_code)
) ENGINE=InnoDB;

-- Weak entity: parameters belong to one rule
CREATE TABLE risk_rule_params (
  rule_id      INT UNSIGNED NOT NULL,
  param_name   VARCHAR(40)  NOT NULL,
  param_value  VARCHAR(100) NOT NULL,
  PRIMARY KEY (rule_id, param_name),
  CONSTRAINT fk_params_rule FOREIGN KEY (rule_id) REFERENCES risk_rules (rule_id)
) ENGINE=InnoDB;

CREATE TABLE fraud_cases (
  case_id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  case_no              VARCHAR(20)  NOT NULL,
  assigned_analyst_id  INT UNSIGNED NULL,
  status               ENUM('OPEN','INVESTIGATING','CLOSED') NOT NULL DEFAULT 'OPEN',
  outcome              ENUM('CONFIRMED_FRAUD','FALSE_POSITIVE','INCONCLUSIVE') NULL,
  opened_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at            DATETIME     NULL,
  PRIMARY KEY (case_id),
  UNIQUE KEY uq_cases_no (case_no),
  CONSTRAINT fk_cases_analyst FOREIGN KEY (assigned_analyst_id) REFERENCES app_users (user_id),
  CONSTRAINT chk_cases_closed CHECK (
       (status = 'CLOSED' AND outcome IS NOT NULL AND closed_at IS NOT NULL)
    OR (status <> 'CLOSED' AND outcome IS NULL AND closed_at IS NULL))
) ENGINE=InnoDB;

CREATE TABLE risk_alerts (
  alert_id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  rule_id                   INT UNSIGNED NOT NULL,
  wallet_id                 INT UNSIGNED NOT NULL,
  triggering_transaction_id BIGINT UNSIGNED NULL,
  case_id                   INT UNSIGNED NULL,
  window_start              DATETIME     NOT NULL,
  window_end                DATETIME     NOT NULL,
  status                    ENUM('OPEN','IN_CASE','DISMISSED','CONFIRMED') NOT NULL DEFAULT 'OPEN',
  details                   VARCHAR(500) NULL,
  created_at                DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (alert_id),
  UNIQUE KEY uq_alert_dedupe (rule_id, wallet_id, window_start),   -- no duplicate alerts for the same window
  KEY idx_alert_status (status),
  KEY idx_alert_wallet (wallet_id, created_at),
  CONSTRAINT fk_alert_rule   FOREIGN KEY (rule_id)   REFERENCES risk_rules (rule_id),
  CONSTRAINT fk_alert_wallet FOREIGN KEY (wallet_id) REFERENCES wallets (wallet_id),
  CONSTRAINT fk_alert_txn    FOREIGN KEY (triggering_transaction_id) REFERENCES transactions (transaction_id),
  CONSTRAINT fk_alert_case   FOREIGN KEY (case_id)   REFERENCES fraud_cases (case_id),
  CONSTRAINT chk_alert_window CHECK (window_end >= window_start)
) ENGINE=InnoDB;

CREATE TABLE case_events (
  event_id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  case_id        INT UNSIGNED NOT NULL,
  actor_user_id  INT UNSIGNED NOT NULL,
  event_type     ENUM('NOTE','ASSIGNED','STATUS_CHANGE','CLOSED') NOT NULL,
  body           TEXT         NOT NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id),
  KEY idx_events_case (case_id, created_at),
  CONSTRAINT fk_events_case  FOREIGN KEY (case_id)       REFERENCES fraud_cases (case_id),
  CONSTRAINT fk_events_actor FOREIGN KEY (actor_user_id) REFERENCES app_users (user_id)
) ENGINE=InnoDB;

-- ---- 2.6 Audit -----------------------------------------------------------
CREATE TABLE audit_logs (
  audit_id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id  INT UNSIGNED NOT NULL,
  action         VARCHAR(50)  NOT NULL,
  entity_type    VARCHAR(50)  NOT NULL,
  entity_id      BIGINT UNSIGNED NOT NULL,
  old_values     JSON         NULL,
  new_values     JSON         NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (audit_id),
  KEY idx_audit_entity (entity_type, entity_id),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES app_users (user_id)
) ENGINE=InnoDB;

-- =====================================================================
-- 3. TRIGGERS
-- =====================================================================
DELIMITER $$

-- ---- 3.1 Ledger entries are append-only ---------------------------------
CREATE TRIGGER trg_entries_bu BEFORE UPDATE ON ledger_entries FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ledger_entries are immutable: post a reversal instead';
END$$

CREATE TRIGGER trg_entries_bd BEFORE DELETE ON ledger_entries FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ledger_entries are immutable: post a reversal instead';
END$$

-- Entries may only be added while their journal is still PENDING
CREATE TRIGGER trg_entries_bi BEFORE INSERT ON ledger_entries FOR EACH ROW
BEGIN
  DECLARE v_status VARCHAR(10);
  SELECT status INTO v_status FROM ledger_journals WHERE journal_id = NEW.journal_id;
  IF v_status IS NULL OR v_status <> 'PENDING' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Entries can only be added to a PENDING journal';
  END IF;
END$$

-- ---- 3.2 Journals: balance check on posting, immutable once posted ------
CREATE TRIGGER trg_journal_bu BEFORE UPDATE ON ledger_journals FOR EACH ROW
BEGIN
  DECLARE v_debit  DECIMAL(15,2);
  DECLARE v_credit DECIMAL(15,2);
  DECLARE v_lines  INT;
  IF OLD.status = 'POSTED' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A posted journal is immutable';
  END IF;
  IF NEW.transaction_id <> OLD.transaction_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A journal cannot be moved to another transaction';
  END IF;
  IF NEW.status = 'POSTED' THEN
    SELECT COALESCE(SUM(CASE WHEN side = 'DEBIT'  THEN amount END), 0),
           COALESCE(SUM(CASE WHEN side = 'CREDIT' THEN amount END), 0),
           COUNT(*)
      INTO v_debit, v_credit, v_lines
      FROM ledger_entries WHERE journal_id = OLD.journal_id;
    IF v_lines < 2 OR v_debit <> v_credit THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Journal is not balanced: total debits must equal total credits';
    END IF;
  END IF;
END$$

CREATE TRIGGER trg_journal_bd BEFORE DELETE ON ledger_journals FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Journals cannot be deleted';
END$$

-- ---- 3.3 Transactions: protect money fields, enforce state machine ------
CREATE TRIGGER trg_txn_bu BEFORE UPDATE ON transactions FOR EACH ROW
BEGIN
  IF NEW.amount <> OLD.amount OR NEW.fee_amount <> OLD.fee_amount
     OR NEW.type_id <> OLD.type_id OR NEW.reference_no <> OLD.reference_no
     OR NEW.initiated_by_user_id <> OLD.initiated_by_user_id
     OR NOT (NEW.reversal_of_transaction_id <=> OLD.reversal_of_transaction_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Financial fields of a transaction are immutable';
  END IF;
  IF NEW.status <> OLD.status AND NOT (
       (OLD.status = 'INITIATED' AND NEW.status IN ('COMPLETED','FAILED'))
    OR (OLD.status = 'COMPLETED' AND NEW.status = 'REVERSED')) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Illegal transaction status change';
  END IF;
END$$

CREATE TRIGGER trg_txn_bd BEFORE DELETE ON transactions FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transactions cannot be deleted';
END$$

-- Automatic status history
CREATE TRIGGER trg_txn_ai AFTER INSERT ON transactions FOR EACH ROW
BEGIN
  INSERT INTO transaction_status_history (transaction_id, from_status, to_status)
  VALUES (NEW.transaction_id, NULL, NEW.status);
END$$

CREATE TRIGGER trg_txn_au AFTER UPDATE ON transactions FOR EACH ROW
BEGIN
  IF NEW.status <> OLD.status THEN
    INSERT INTO transaction_status_history (transaction_id, from_status, to_status, reason)
    VALUES (NEW.transaction_id, OLD.status, NEW.status, NEW.failure_reason);
  END IF;
END$$

-- ---- 3.4 Wallets ---------------------------------------------------------
-- A wallet type is only allowed for its matching holder type
CREATE TRIGGER trg_wallets_bi BEFORE INSERT ON wallets FOR EACH ROW
BEGIN
  DECLARE v_holder_type  VARCHAR(10);
  DECLARE v_allowed_type VARCHAR(10);
  SELECT holder_type INTO v_holder_type FROM account_holders WHERE holder_id = NEW.holder_id;
  SELECT allowed_holder_type INTO v_allowed_type FROM wallet_types WHERE wallet_type_id = NEW.wallet_type_id;
  IF v_holder_type IS NULL OR v_allowed_type IS NULL OR v_holder_type <> v_allowed_type THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This wallet type is not allowed for this holder type';
  END IF;
END$$

-- Every wallet automatically gets exactly one ledger account
CREATE TRIGGER trg_wallets_ai AFTER INSERT ON wallets FOR EACH ROW
BEGIN
  INSERT INTO ledger_accounts (account_kind, wallet_id, name, allow_negative)
  VALUES ('WALLET', NEW.wallet_id, CONCAT('Wallet ', NEW.wallet_no), 0);
END$$

-- ---- 3.5 Agent profile only for AGENT holders ----------------------------
CREATE TRIGGER trg_agent_bi BEFORE INSERT ON agent_profiles FOR EACH ROW
BEGIN
  DECLARE v_type VARCHAR(10);
  SELECT holder_type INTO v_type FROM account_holders WHERE holder_id = NEW.holder_id;
  IF v_type IS NULL OR v_type <> 'AGENT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'An agent profile requires holder_type = AGENT';
  END IF;
END$$

-- ---- 3.6 Audit log is append-only ----------------------------------------
CREATE TRIGGER trg_audit_bu BEFORE UPDATE ON audit_logs FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_logs are append-only';
END$$

CREATE TRIGGER trg_audit_bd BEFORE DELETE ON audit_logs FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_logs are append-only';
END$$

DELIMITER ;

-- =====================================================================
-- 4. VIEWS (balances are always derived, never stored)
-- =====================================================================
CREATE VIEW v_ledger_balances AS
SELECT la.ledger_account_id, la.account_kind, la.name,
       COALESCE(SUM(CASE p.side WHEN 'CREDIT' THEN p.amount ELSE -p.amount END), 0) AS balance
FROM ledger_accounts la
LEFT JOIN (SELECT e.ledger_account_id, e.side, e.amount
             FROM ledger_entries e
             JOIN ledger_journals j ON j.journal_id = e.journal_id AND j.status = 'POSTED') p
       ON p.ledger_account_id = la.ledger_account_id
GROUP BY la.ledger_account_id, la.account_kind, la.name;

CREATE VIEW v_wallet_balances AS
SELECT w.wallet_id, w.wallet_no, w.holder_id, w.status, b.balance
FROM wallets w
JOIN ledger_accounts la ON la.wallet_id = w.wallet_id
JOIN v_ledger_balances b ON b.ledger_account_id = la.ledger_account_id;

-- Statement with a running balance (window function)
CREATE VIEW v_wallet_statement AS
SELECT w.wallet_no, e.entry_id, j.posted_at, t.reference_no, tt.code AS txn_type,
       e.side, e.amount,
       SUM(CASE e.side WHEN 'CREDIT' THEN e.amount ELSE -e.amount END)
         OVER (PARTITION BY e.ledger_account_id ORDER BY e.entry_id) AS running_balance
FROM ledger_entries e
JOIN ledger_accounts la ON la.ledger_account_id = e.ledger_account_id
JOIN wallets w          ON w.wallet_id = la.wallet_id
JOIN ledger_journals j  ON j.journal_id = e.journal_id AND j.status = 'POSTED'
JOIN transactions t     ON t.transaction_id = j.transaction_id
JOIN transaction_types tt ON tt.type_id = t.type_id;

-- =====================================================================
-- 5. POSTING PROCEDURE: the only way money moves
--   p_source_ref / p_dest_ref accept a wallet_no or a system code
--   (e.g. 'SETTLEMENT'). Business failures (insufficient funds, limits,
--   frozen wallet...) are recorded as FAILED transactions and returned
--   in p_result / p_message instead of raising an error.
-- =====================================================================
DELIMITER $$

CREATE PROCEDURE sp_post_transfer(
  IN  p_type_code   VARCHAR(30),
  IN  p_user_id     INT UNSIGNED,
  IN  p_idem_key    VARCHAR(64),
  IN  p_source_ref  VARCHAR(30),
  IN  p_dest_ref    VARCHAR(30),
  IN  p_amount      DECIMAL(15,2),
  IN  p_note        VARCHAR(255),
  OUT p_txn_id      BIGINT UNSIGNED,
  OUT p_result      VARCHAR(20),
  OUT p_message     VARCHAR(255)
)
proc: BEGIN
  DECLARE v_txn         BIGINT UNSIGNED DEFAULT NULL;
  DECLARE v_status      VARCHAR(20)     DEFAULT NULL;
  DECLARE v_type_id     INT UNSIGNED    DEFAULT NULL;
  DECLARE v_src_acct    INT UNSIGNED    DEFAULT NULL;
  DECLARE v_src_wallet  INT UNSIGNED    DEFAULT NULL;
  DECLARE v_src_neg     TINYINT         DEFAULT NULL;
  DECLARE v_src_wstatus VARCHAR(10)     DEFAULT NULL;
  DECLARE v_dst_acct    INT UNSIGNED    DEFAULT NULL;
  DECLARE v_dst_wallet  INT UNSIGNED    DEFAULT NULL;
  DECLARE v_dst_wstatus VARCHAR(10)     DEFAULT NULL;
  DECLARE v_fee_acct    INT UNSIGNED    DEFAULT NULL;
  DECLARE v_fee         DECIMAL(15,2)   DEFAULT 0.00;
  DECLARE v_total       DECIMAL(15,2)   DEFAULT 0.00;
  DECLARE v_balance     DECIMAL(15,2)   DEFAULT 0.00;
  DECLARE v_limit       DECIMAL(15,2)   DEFAULT NULL;
  DECLARE v_used        DECIMAL(15,2)   DEFAULT 0.00;
  DECLARE v_locked      INT             DEFAULT 0;
  DECLARE v_journal     BIGINT UNSIGNED DEFAULT NULL;
  DECLARE v_msg         VARCHAR(255)    DEFAULT NULL;

  -- Any error: undo the money movement, then mark the attempt FAILED
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 v_msg = MESSAGE_TEXT;
    ROLLBACK;
    IF v_txn IS NOT NULL THEN
      UPDATE transactions
         SET status = 'FAILED', failure_reason = LEFT(v_msg, 255)
       WHERE transaction_id = v_txn AND status = 'INITIATED';
      COMMIT;
    END IF;
    SET p_txn_id = v_txn, p_result = 'FAILED', p_message = v_msg;
  END;

  -- READ COMMITTED so the balance read below always sees the latest
  -- committed entries once the account rows are locked
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

  -- ---- Validate input (no transaction row is created for bad input) ----
  IF p_amount IS NULL OR p_amount <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_AMOUNT';
  END IF;

  SELECT type_id INTO v_type_id FROM transaction_types WHERE code = p_type_code;
  IF v_type_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'UNKNOWN_TRANSACTION_TYPE';
  END IF;

  -- ---- Idempotency: a repeated request returns the original result ------
  SELECT transaction_id, status INTO v_txn, v_status
    FROM transactions
   WHERE initiated_by_user_id = p_user_id AND idempotency_key = p_idem_key;
  IF v_txn IS NOT NULL THEN
    SET p_txn_id = v_txn, p_result = v_status, p_message = 'DUPLICATE_REQUEST';
    LEAVE proc;
  END IF;

  -- ---- Resolve the two parties -----------------------------------------
  SELECT la.ledger_account_id, w.wallet_id, la.allow_negative, w.status
    INTO v_src_acct, v_src_wallet, v_src_neg, v_src_wstatus
    FROM ledger_accounts la LEFT JOIN wallets w ON w.wallet_id = la.wallet_id
   WHERE w.wallet_no = p_source_ref OR la.system_code = p_source_ref LIMIT 1;
  IF v_src_acct IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SOURCE_NOT_FOUND';
  END IF;

  SELECT la.ledger_account_id, w.wallet_id, w.status
    INTO v_dst_acct, v_dst_wallet, v_dst_wstatus
    FROM ledger_accounts la LEFT JOIN wallets w ON w.wallet_id = la.wallet_id
   WHERE w.wallet_no = p_dest_ref OR la.system_code = p_dest_ref LIMIT 1;
  IF v_dst_acct IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DESTINATION_NOT_FOUND';
  END IF;
  IF v_src_acct = v_dst_acct THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SOURCE_AND_DESTINATION_ARE_THE_SAME';
  END IF;

  -- ---- Fee (charged to the source on top of the amount) -----------------
  SELECT fee_flat + ROUND(p_amount * fee_percent, 2) INTO v_fee
    FROM fee_rules
   WHERE type_id = v_type_id
     AND p_amount BETWEEN min_amount AND max_amount
     AND effective_from <= CURDATE()
     AND (effective_to IS NULL OR effective_to >= CURDATE())
   ORDER BY effective_from DESC LIMIT 1;
  SET v_total = p_amount + v_fee;
  SELECT ledger_account_id INTO v_fee_acct FROM ledger_accounts WHERE system_code = 'FEE_REVENUE';

  -- ---- Record the attempt (autocommit: it survives a later rollback) -----
  INSERT INTO transactions (reference_no, type_id, initiated_by_user_id, idempotency_key, amount, fee_amount)
  VALUES (CONCAT('TX-', UPPER(SUBSTRING(REPLACE(UUID(), '-', ''), 1, 16))),
          v_type_id, p_user_id, p_idem_key, p_amount, v_fee);
  SET v_txn = LAST_INSERT_ID();
  INSERT INTO transfer_details (transaction_id, source_account_id, destination_account_id, note)
  VALUES (v_txn, v_src_acct, v_dst_acct, p_note);

  -- ---- The atomic part ---------------------------------------------------
  START TRANSACTION;

  -- Lock both ledger accounts (always in the same scan order, to avoid deadlocks)
  SELECT COUNT(*) INTO v_locked
    FROM ledger_accounts
   WHERE ledger_account_id IN (v_src_acct, v_dst_acct) FOR UPDATE;

  -- Business rules (any failure raises an error caught by the handler)
  IF v_src_wallet IS NOT NULL AND v_src_wstatus <> 'ACTIVE' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SOURCE_WALLET_NOT_ACTIVE';
  END IF;
  IF v_dst_wallet IS NOT NULL AND v_dst_wstatus <> 'ACTIVE' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DESTINATION_WALLET_NOT_ACTIVE';
  END IF;

  SELECT COALESCE(SUM(CASE side WHEN 'CREDIT' THEN amount ELSE -amount END), 0)
    INTO v_balance FROM ledger_entries WHERE ledger_account_id = v_src_acct;
  IF v_src_neg = 0 AND v_balance < v_total THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INSUFFICIENT_FUNDS';
  END IF;

  IF v_src_wallet IS NOT NULL THEN
    -- per-transaction limit
    SET v_limit = NULL;
    SELECT max_amount INTO v_limit FROM wallet_limits
     WHERE wallet_id = v_src_wallet AND limit_type = 'PER_TXN'
       AND effective_from <= CURDATE() AND (effective_to IS NULL OR effective_to >= CURDATE())
     ORDER BY effective_from DESC LIMIT 1;
    IF v_limit IS NOT NULL AND p_amount > v_limit THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'PER_TRANSACTION_LIMIT_EXCEEDED';
    END IF;

    -- daily limit
    SET v_limit = NULL;
    SELECT max_amount INTO v_limit FROM wallet_limits
     WHERE wallet_id = v_src_wallet AND limit_type = 'DAILY'
       AND effective_from <= CURDATE() AND (effective_to IS NULL OR effective_to >= CURDATE())
     ORDER BY effective_from DESC LIMIT 1;
    IF v_limit IS NOT NULL THEN
      SELECT COALESCE(SUM(t.amount), 0) INTO v_used
        FROM transactions t JOIN transfer_details d ON d.transaction_id = t.transaction_id
       WHERE d.source_account_id = v_src_acct AND t.status = 'COMPLETED'
         AND t.completed_at >= CURDATE();
      IF v_used + p_amount > v_limit THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DAILY_LIMIT_EXCEEDED';
      END IF;
    END IF;

    -- monthly limit
    SET v_limit = NULL;
    SELECT max_amount INTO v_limit FROM wallet_limits
     WHERE wallet_id = v_src_wallet AND limit_type = 'MONTHLY'
       AND effective_from <= CURDATE() AND (effective_to IS NULL OR effective_to >= CURDATE())
     ORDER BY effective_from DESC LIMIT 1;
    IF v_limit IS NOT NULL THEN
      SELECT COALESCE(SUM(t.amount), 0) INTO v_used
        FROM transactions t JOIN transfer_details d ON d.transaction_id = t.transaction_id
       WHERE d.source_account_id = v_src_acct AND t.status = 'COMPLETED'
         AND t.completed_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01');
      IF v_used + p_amount > v_limit THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'MONTHLY_LIMIT_EXCEEDED';
      END IF;
    END IF;
  END IF;

  -- Balanced journal: debit source (amount + fee), credit destination (amount),
  -- credit FEE_REVENUE (fee)
  INSERT INTO ledger_journals (transaction_id, description)
  VALUES (v_txn, CONCAT(p_type_code, ' ', COALESCE(p_note, '')));
  SET v_journal = LAST_INSERT_ID();

  INSERT INTO ledger_entries (journal_id, ledger_account_id, side, amount)
  VALUES (v_journal, v_src_acct, 'DEBIT',  v_total),
         (v_journal, v_dst_acct, 'CREDIT', p_amount);
  IF v_fee > 0 THEN
    INSERT INTO ledger_entries (journal_id, ledger_account_id, side, amount)
    VALUES (v_journal, v_fee_acct, 'CREDIT', v_fee);
  END IF;

  UPDATE ledger_journals SET status = 'POSTED', posted_at = NOW() WHERE journal_id = v_journal;  -- balance trigger runs here
  UPDATE transactions    SET status = 'COMPLETED', completed_at = NOW() WHERE transaction_id = v_txn;
  COMMIT;

  SET p_txn_id = v_txn, p_result = 'COMPLETED', p_message = 'OK';
END$$

DELIMITER ;

-- =====================================================================
-- 6. REFERENCE DATA
-- =====================================================================
INSERT INTO roles (role_name) VALUES
  ('CUSTOMER'), ('AGENT'), ('FRAUD_ANALYST'), ('ADMIN'), ('AUDITOR');

INSERT INTO wallet_types (code, name, allowed_holder_type) VALUES
  ('PERSONAL',    'Personal wallet',    'CUSTOMER'),
  ('AGENT_FLOAT', 'Agent float wallet', 'AGENT');

INSERT INTO transaction_types (code, name) VALUES
  ('SEND_MONEY', 'Send money'),
  ('CASH_IN',    'Cash in via agent'),
  ('CASH_OUT',   'Cash out via agent'),
  ('FLOAT_LOAD', 'Agent float top-up'),
  ('REVERSAL',   'Reversal');

-- System ledger accounts (may go negative: they represent the outside world)
INSERT INTO ledger_accounts (account_kind, system_code, name, allow_negative) VALUES
  ('SYSTEM', 'SETTLEMENT',  'Settlement (source of agent float)', 1),
  ('SYSTEM', 'FEE_REVENUE', 'Fee revenue', 1);

-- Illustrative fee schedule (change to taste)
INSERT INTO fee_rules (type_id, min_amount, max_amount, fee_flat, fee_percent, effective_from)
SELECT type_id, 1.00, 25000.00, 5.00, 0.00000, '2026-01-01' FROM transaction_types WHERE code = 'SEND_MONEY';
INSERT INTO fee_rules (type_id, min_amount, max_amount, fee_flat, fee_percent, effective_from)
SELECT type_id, 1.00, 50000.00, 0.00, 0.01850, '2026-01-01' FROM transaction_types WHERE code = 'CASH_OUT';

-- Fraud rules and their tunable parameters
INSERT INTO risk_rules (rule_code, description, severity) VALUES
  ('VELOCITY',     'Too many outgoing transfers in a short window',              'MEDIUM'),
  ('STRUCTURING',  'Repeated amounts just under the wallet limit',               'HIGH'),
  ('RAPID_IN_OUT', 'Funds received and almost fully sent on within minutes',     'HIGH');

INSERT INTO risk_rule_params (rule_id, param_name, param_value)
SELECT rule_id, 'window_minutes', '10' FROM risk_rules WHERE rule_code = 'VELOCITY';
INSERT INTO risk_rule_params (rule_id, param_name, param_value)
SELECT rule_id, 'max_transfers', '5' FROM risk_rules WHERE rule_code = 'VELOCITY';
INSERT INTO risk_rule_params (rule_id, param_name, param_value)
SELECT rule_id, 'window_hours', '24' FROM risk_rules WHERE rule_code = 'STRUCTURING';
INSERT INTO risk_rule_params (rule_id, param_name, param_value)
SELECT rule_id, 'min_count', '3' FROM risk_rules WHERE rule_code = 'STRUCTURING';
INSERT INTO risk_rule_params (rule_id, param_name, param_value)
SELECT rule_id, 'limit_fraction', '0.90' FROM risk_rules WHERE rule_code = 'STRUCTURING';
INSERT INTO risk_rule_params (rule_id, param_name, param_value)
SELECT rule_id, 'window_minutes', '30' FROM risk_rules WHERE rule_code = 'RAPID_IN_OUT';
INSERT INTO risk_rule_params (rule_id, param_name, param_value)
SELECT rule_id, 'outflow_fraction', '0.90' FROM risk_rules WHERE rule_code = 'RAPID_IN_OUT';

-- =====================================================================
-- 7. PRIVILEGES: the application user can read the ledger but can only
--    change it through sp_post_transfer (which runs with definer rights)
--    Replace the password before using this anywhere real.
-- =====================================================================
CREATE USER IF NOT EXISTS 'sentinel_app'@'localhost' IDENTIFIED BY 'ChangeMe_123!';

GRANT SELECT, INSERT, UPDATE, DELETE ON sentinelpay.roles             TO 'sentinel_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON sentinelpay.user_roles        TO 'sentinel_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON sentinelpay.beneficiaries     TO 'sentinel_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON sentinelpay.wallet_types      TO 'sentinel_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON sentinelpay.wallet_limits     TO 'sentinel_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON sentinelpay.transaction_types TO 'sentinel_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON sentinelpay.fee_rules         TO 'sentinel_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON sentinelpay.risk_rules        TO 'sentinel_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON sentinelpay.risk_rule_params  TO 'sentinel_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON sentinelpay.app_users       TO 'sentinel_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON sentinelpay.account_holders TO 'sentinel_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON sentinelpay.agent_profiles  TO 'sentinel_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON sentinelpay.wallets         TO 'sentinel_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON sentinelpay.fraud_cases     TO 'sentinel_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON sentinelpay.risk_alerts     TO 'sentinel_app'@'localhost';
GRANT SELECT, INSERT ON sentinelpay.case_events TO 'sentinel_app'@'localhost';
GRANT SELECT, INSERT ON sentinelpay.audit_logs  TO 'sentinel_app'@'localhost';
-- Read-only: money tables change only through the procedure
GRANT SELECT ON sentinelpay.ledger_accounts             TO 'sentinel_app'@'localhost';
GRANT SELECT ON sentinelpay.ledger_journals             TO 'sentinel_app'@'localhost';
GRANT SELECT ON sentinelpay.ledger_entries              TO 'sentinel_app'@'localhost';
GRANT SELECT ON sentinelpay.transactions                TO 'sentinel_app'@'localhost';
GRANT SELECT ON sentinelpay.transfer_details            TO 'sentinel_app'@'localhost';
GRANT SELECT ON sentinelpay.transaction_status_history  TO 'sentinel_app'@'localhost';
GRANT SELECT ON sentinelpay.v_ledger_balances           TO 'sentinel_app'@'localhost';
GRANT SELECT ON sentinelpay.v_wallet_balances           TO 'sentinel_app'@'localhost';
GRANT SELECT ON sentinelpay.v_wallet_statement          TO 'sentinel_app'@'localhost';
GRANT EXECUTE ON PROCEDURE sentinelpay.sp_post_transfer TO 'sentinel_app'@'localhost';

-- =====================================================================
-- 8. DEMO DATA AND CHECKS (optional; delete this section for real use)
--    The password hashes are placeholders: your app must store real bcrypt hashes.
-- =====================================================================
INSERT INTO app_users (phone, email, password_hash) VALUES
  ('01700000000', 'admin@sentinelpay.test',   '$2b$10$PLACEHOLDER_HASH_REPLACE_IN_APP'),
  ('01700000001', 'analyst@sentinelpay.test', '$2b$10$PLACEHOLDER_HASH_REPLACE_IN_APP'),
  ('01711111111', NULL, '$2b$10$PLACEHOLDER_HASH_REPLACE_IN_APP'),
  ('01722222222', NULL, '$2b$10$PLACEHOLDER_HASH_REPLACE_IN_APP'),
  ('01733333333', NULL, '$2b$10$PLACEHOLDER_HASH_REPLACE_IN_APP');

INSERT INTO user_roles (user_id, role_id)
SELECT u.user_id, r.role_id FROM app_users u JOIN roles r
  ON (u.phone = '01700000000' AND r.role_name = 'ADMIN')
  OR (u.phone = '01700000001' AND r.role_name = 'FRAUD_ANALYST')
  OR (u.phone IN ('01711111111','01722222222') AND r.role_name = 'CUSTOMER')
  OR (u.phone = '01733333333' AND r.role_name = 'AGENT');

INSERT INTO account_holders (user_id, holder_type, full_name, date_of_birth, address, kyc_status)
SELECT user_id, 'CUSTOMER', 'Demo Customer One', '1999-04-12', 'Dhaka', 'VERIFIED' FROM app_users WHERE phone = '01711111111';
INSERT INTO account_holders (user_id, holder_type, full_name, date_of_birth, address, kyc_status)
SELECT user_id, 'CUSTOMER', 'Demo Customer Two', '2000-09-30', 'Chattogram', 'VERIFIED' FROM app_users WHERE phone = '01722222222';
INSERT INTO account_holders (user_id, holder_type, full_name, date_of_birth, address, kyc_status)
SELECT user_id, 'AGENT', 'Demo Agent', '1988-01-20', 'Dhaka', 'VERIFIED' FROM app_users WHERE phone = '01733333333';

INSERT INTO agent_profiles (holder_id, agent_code, outlet_name, district, commission_rate)
SELECT h.holder_id, 'AG-DHK-001', 'Demo Telecom and Cash Point', 'Dhaka', 0.0040
  FROM account_holders h JOIN app_users u ON u.user_id = h.user_id WHERE u.phone = '01733333333';

-- Wallets (each automatically gets its ledger account via trigger)
INSERT INTO wallets (holder_id, wallet_type_id, wallet_no)
SELECT h.holder_id, wt.wallet_type_id, u.phone
  FROM account_holders h JOIN app_users u ON u.user_id = h.user_id
  JOIN wallet_types wt ON wt.code = 'PERSONAL'
 WHERE u.phone IN ('01711111111', '01722222222');
INSERT INTO wallets (holder_id, wallet_type_id, wallet_no, label)
SELECT h.holder_id, wt.wallet_type_id, 'AG-DHK-001', 'Float'
  FROM account_holders h JOIN app_users u ON u.user_id = h.user_id
  JOIN wallet_types wt ON wt.code = 'AGENT_FLOAT'
 WHERE u.phone = '01733333333';

-- Limits for the customer wallets
INSERT INTO wallet_limits (wallet_id, limit_type, effective_from, max_amount)
SELECT w.wallet_id, l.limit_type, '2026-01-01', l.max_amount
  FROM wallets w
  JOIN (SELECT 'PER_TXN' AS limit_type, 25000.00 AS max_amount
        UNION ALL SELECT 'DAILY', 50000.00
        UNION ALL SELECT 'MONTHLY', 200000.00) l
 WHERE w.wallet_no IN ('01711111111', '01722222222');

-- Money flow: settlement -> agent float -> customer 1 -> customer 2
SET @admin = (SELECT user_id FROM app_users WHERE phone = '01700000000');
SET @agent = (SELECT user_id FROM app_users WHERE phone = '01733333333');
SET @cust1 = (SELECT user_id FROM app_users WHERE phone = '01711111111');
SET @cust2 = (SELECT user_id FROM app_users WHERE phone = '01722222222');

CALL sp_post_transfer('FLOAT_LOAD', @admin, 'demo-001', 'SETTLEMENT', 'AG-DHK-001', 100000.00, 'Initial float', @tx, @res, @msg);
SELECT @tx AS txn_id, @res AS result, @msg AS message;
CALL sp_post_transfer('CASH_IN',    @agent, 'demo-002', 'AG-DHK-001', '01711111111', 5000.00, 'Cash in at outlet', @tx, @res, @msg);
SELECT @tx AS txn_id, @res AS result, @msg AS message;
CALL sp_post_transfer('SEND_MONEY', @cust1, 'demo-003', '01711111111', '01722222222', 1200.00, 'Rent share', @tx, @res, @msg);
SELECT @tx AS txn_id, @res AS result, @msg AS message;
-- Deliberate failure: customer 2 only has 1200, so this is recorded as FAILED
CALL sp_post_transfer('SEND_MONEY', @cust2, 'demo-004', '01722222222', '01711111111', 9999.00, 'Too much', @tx, @res, @msg);
SELECT @tx AS txn_id, @res AS result, @msg AS message;
-- Repeating a request returns the original result and moves no money
CALL sp_post_transfer('SEND_MONEY', @cust1, 'demo-003', '01711111111', '01722222222', 1200.00, 'Rent share', @tx, @res, @msg);
SELECT @tx AS txn_id, @res AS result, @msg AS message;

-- Expected: agent 95000.00, customer 1 3795.00 (5000 - 1200 - 5 fee),
-- customer 2 1200.00, FEE_REVENUE 5.00, SETTLEMENT -100000.00
SELECT * FROM v_wallet_balances;
SELECT * FROM v_ledger_balances;
SELECT * FROM v_wallet_statement WHERE wallet_no = '01711111111';
SELECT transaction_id, reference_no, status, failure_reason FROM transactions;

-- Trial balance: must be exactly 0.00 (money is never created or destroyed)
SELECT SUM(balance) AS trial_balance FROM v_ledger_balances;

-- These must FAIL (uncomment one at a time to see the protections work):
-- UPDATE ledger_entries SET amount = 1 WHERE entry_id = 1;
-- DELETE FROM ledger_entries WHERE entry_id = 1;
-- UPDATE transactions SET amount = 1 WHERE transaction_id = 1;
