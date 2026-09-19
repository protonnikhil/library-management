CREATE DATABASE IF NOT EXISTS library_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE library_db;


-- =========================================
-- BOOKS TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS books (
    id INT AUTO_INCREMENT PRIMARY KEY,

    isbn VARCHAR(30) NOT NULL UNIQUE,

    title VARCHAR(150) NOT NULL,

    author VARCHAR(120) NOT NULL,

    category VARCHAR(80) DEFAULT '',

    total_copies INT NOT NULL DEFAULT 1,

    available_copies INT NOT NULL DEFAULT 1,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================================
-- MEMBERS TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS members (
    id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(120) NOT NULL,

    email VARCHAR(150) NOT NULL,

    phone VARCHAR(30) NOT NULL,

    joined_date DATE NOT NULL DEFAULT (CURRENT_DATE),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================================
-- ISSUES TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS issues (
    id INT AUTO_INCREMENT PRIMARY KEY,

    book_id INT NOT NULL,

    member_id INT NOT NULL,

    issue_date DATE NOT NULL DEFAULT (CURRENT_DATE),

    due_date DATE NOT NULL,

    return_date DATE NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_issue_book
        FOREIGN KEY (book_id)
        REFERENCES books(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_issue_member
        FOREIGN KEY (member_id)
        REFERENCES members(id)
        ON DELETE RESTRICT
);


-- =========================================
-- SAMPLE BOOK DATA
-- =========================================

INSERT INTO books
(
    isbn,
    title,
    author,
    category,
    total_copies,
    available_copies
)
VALUES
(
    '9780131103627',
    'The C Programming Language',
    'Brian Kernighan',
    'Programming',
    3,
    3
),
(
    '9780132350884',
    'Clean Code',
    'Robert C. Martin',
    'Programming',
    2,
    2
),
(
    '9780262033848',
    'Introduction to Algorithms',
    'Thomas H. Cormen',
    'Algorithms',
    2,
    2
),
(
    '9780134685991',
    'Effective Java',
    'Joshua Bloch',
    'Programming',
    2,
    2
),
(
    '9781492052203',
    'Designing Data-Intensive Applications',
    'Martin Kleppmann',
    'Database',
    1,
    1
);


-- =========================================
-- SAMPLE MEMBER DATA
-- =========================================

INSERT INTO members
(
    name,
    email,
    phone
)
VALUES
(
    'Rahul Kumar',
    'rahul@example.com',
    '9876543210'
),
(
    'Priya Sharma',
    'priya@example.com',
    '9876501234'
),
(
    'Aman Singh',
    'aman@example.com',
    '9876512345'
);
