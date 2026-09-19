<?php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");

require_once __DIR__ . "/config.php";


function out($success, $message = "", $data = [])
{
    echo json_encode([
        "success" => $success,
        "message" => $message,
        "data" => $data
    ]);

    exit;
}


function body()
{
    $raw = file_get_contents("php://input");

    $data = json_decode($raw, true);

    return $data ?: $_POST;
}


function clean($value)
{
    return trim((string)($value ?? ""));
}


$action = $_GET["action"] ?? "";


try {

    /* =========================
       DASHBOARD
    ========================== */

    if ($action === "dashboard") {

        $totalBooks = (int)$pdo
            ->query("SELECT COALESCE(SUM(total_copies), 0) FROM books")
            ->fetchColumn();

        $totalMembers = (int)$pdo
            ->query("SELECT COUNT(*) FROM members")
            ->fetchColumn();

        $issued = (int)$pdo
            ->query("SELECT COUNT(*) FROM issues WHERE return_date IS NULL")
            ->fetchColumn();

        $overdue = (int)$pdo
            ->query(
                "SELECT COUNT(*)
                 FROM issues
                 WHERE return_date IS NULL
                 AND due_date < CURDATE()"
            )
            ->fetchColumn();


        $query = $pdo->query(
            "SELECT
                i.*,
                b.title,
                m.name AS member_name,

                CASE
                    WHEN i.return_date IS NOT NULL THEN 'Returned'
                    WHEN i.due_date < CURDATE() THEN 'Overdue'
                    ELSE 'Issued'
                END AS status

             FROM issues i

             JOIN books b
             ON b.id = i.book_id

             JOIN members m
             ON m.id = i.member_id

             ORDER BY i.id DESC

             LIMIT 8"
        );


        out(true, "", [
            "total_books" => $totalBooks,
            "total_members" => $totalMembers,
            "issued_books" => $issued,
            "overdue_books" => $overdue,
            "recent" => $query->fetchAll()
        ]);
    }


    /* =========================
       BOOKS
    ========================== */

    if ($action === "books") {

        $query = $pdo->query(
            "SELECT *
             FROM books
             ORDER BY id DESC"
        );

        out(true, "", $query->fetchAll());
    }


    /* =========================
       MEMBERS
    ========================== */

    if ($action === "members") {

        $query = $pdo->query(
            "SELECT *
             FROM members
             ORDER BY id DESC"
        );

        out(true, "", $query->fetchAll());
    }


    /* =========================
       ISSUES
    ========================== */

    if ($action === "issues") {

        $query = $pdo->query(
            "SELECT
                i.*,
                b.title,
                m.name AS member_name,

                CASE
                    WHEN i.return_date IS NOT NULL THEN 'Returned'
                    WHEN i.due_date < CURDATE() THEN 'Overdue'
                    ELSE 'Issued'
                END AS status

             FROM issues i

             JOIN books b
             ON b.id = i.book_id

             JOIN members m
             ON m.id = i.member_id

             ORDER BY i.id DESC"
        );

        out(true, "", $query->fetchAll());
    }


    /* =========================
       ISSUE FORM OPTIONS
    ========================== */

    if ($action === "options") {

        $books = $pdo->query(
            "SELECT id, title, available_copies
             FROM books
             WHERE available_copies > 0
             ORDER BY title"
        )->fetchAll();


        $members = $pdo->query(
            "SELECT id, name
             FROM members
             ORDER BY name"
        )->fetchAll();


        out(true, "", [
            "books" => $books,
            "members" => $members
        ]);
    }


    $data = body();


    /* =========================
       ADD BOOK
    ========================== */

    if ($action === "add_book") {

        $isbn = clean($data["isbn"]);
        $title = clean($data["title"]);
        $author = clean($data["author"]);
        $category = clean($data["category"]);

        $total = max(
            0,
            (int)($data["total_copies"] ?? 0)
        );


        if (
            !$isbn ||
            !$title ||
            !$author ||
            $total < 1
        ) {
            out(
                false,
                "Please enter all required book details."
            );
        }


        $statement = $pdo->prepare(
            "INSERT INTO books
                (
                    isbn,
                    title,
                    author,
                    category,
                    total_copies,
                    available_copies
                )

             VALUES (?, ?, ?, ?, ?, ?)"
        );


        $statement->execute([
            $isbn,
            $title,
            $author,
            $category,
            $total,
            $total
        ]);


        out(true, "Book added successfully.");
    }


    /* =========================
       EDIT BOOK
    ========================== */

    if ($action === "edit_book") {

        $id = (int)$data["id"];

        $total = max(
            0,
            (int)($data["total_copies"] ?? 0)
        );


        $statement = $pdo->prepare(
            "SELECT
                total_copies,
                available_copies

             FROM books

             WHERE id = ?"
        );

        $statement->execute([$id]);

        $book = $statement->fetch();


        if (!$book) {
            out(false, "Book not found.");
        }


        $issuedCopies =
            (int)$book["total_copies"]
            -
            (int)$book["available_copies"];


        if ($total < $issuedCopies) {

            out(
                false,
                "Total copies cannot be less than currently issued copies."
            );
        }


        $availableCopies =
            $total - $issuedCopies;


        $statement = $pdo->prepare(
            "UPDATE books

             SET
                isbn = ?,
                title = ?,
                author = ?,
                category = ?,
                total_copies = ?,
                available_copies = ?

             WHERE id = ?"
        );


        $statement->execute([
            clean($data["isbn"]),
            clean($data["title"]),
            clean($data["author"]),
            clean($data["category"]),
            $total,
            $availableCopies,
            $id
        ]);


        out(true, "Book updated successfully.");
    }


    /* =========================
       DELETE BOOK
    ========================== */

    if ($action === "delete_book") {

        $id = (int)$data["id"];


        $statement = $pdo->prepare(
            "SELECT COUNT(*)
             FROM issues

             WHERE book_id = ?
             AND return_date IS NULL"
        );


        $statement->execute([$id]);


        if ((int)$statement->fetchColumn() > 0) {

            out(
                false,
                "Cannot delete a book that is currently issued."
            );
        }


        $statement = $pdo->prepare(
            "DELETE FROM books
             WHERE id = ?"
        );


        $statement->execute([$id]);


        out(true, "Book deleted successfully.");
    }


    /* =========================
       ADD MEMBER
    ========================== */

    if ($action === "add_member") {

        $statement = $pdo->prepare(
            "INSERT INTO members
                (
                    name,
                    email,
                    phone
                )

             VALUES (?, ?, ?)"
        );


        $statement->execute([
            clean($data["name"]),
            clean($data["email"]),
            clean($data["phone"])
        ]);


        out(true, "Member added successfully.");
    }


    /* =========================
       EDIT MEMBER
    ========================== */

    if ($action === "edit_member") {

        $statement = $pdo->prepare(
            "UPDATE members

             SET
                name = ?,
                email = ?,
                phone = ?

             WHERE id = ?"
        );


        $statement->execute([
            clean($data["name"]),
            clean($data["email"]),
            clean($data["phone"]),
            (int)$data["id"]
        ]);


        out(true, "Member updated successfully.");
    }


    /* =========================
       DELETE MEMBER
    ========================== */

    if ($action === "delete_member") {

        $id = (int)$data["id"];


        $statement = $pdo->prepare(
            "SELECT COUNT(*)
             FROM issues

             WHERE member_id = ?
             AND return_date IS NULL"
        );


        $statement->execute([$id]);


        if ((int)$statement->fetchColumn() > 0) {

            out(
                false,
                "Cannot delete a member with an active issued book."
            );
        }


        $statement = $pdo->prepare(
            "DELETE FROM members
             WHERE id = ?"
        );


        $statement->execute([$id]);


        out(true, "Member deleted successfully.");
    }


    /* =========================
       ISSUE BOOK
    ========================== */

    if ($action === "issue") {

        $bookId = (int)$data["book_id"];

        $memberId = (int)$data["member_id"];

        $dueDate = clean($data["due_date"]);


        if (
            !$bookId ||
            !$memberId ||
            !$dueDate
        ) {
            out(
                false,
                "Please select book, member and due date."
            );
        }


        $pdo->beginTransaction();


        $statement = $pdo->prepare(
            "SELECT available_copies

             FROM books

             WHERE id = ?

             FOR UPDATE"
        );


        $statement->execute([$bookId]);

        $book = $statement->fetch();


        if (
            !$book ||
            (int)$book["available_copies"] < 1
        ) {

            $pdo->rollBack();

            out(
                false,
                "Book is not available."
            );
        }


        $statement = $pdo->prepare(
            "INSERT INTO issues
                (
                    book_id,
                    member_id,
                    due_date
                )

             VALUES (?, ?, ?)"
        );


        $statement->execute([
            $bookId,
            $memberId,
            $dueDate
        ]);


        $statement = $pdo->prepare(
            "UPDATE books

             SET available_copies =
                 available_copies - 1

             WHERE id = ?"
        );


        $statement->execute([$bookId]);


        $pdo->commit();


        out(true, "Book issued successfully.");
    }


    /* =========================
       RETURN BOOK
    ========================== */

    if ($action === "return_book") {

        $issueId = (int)$data["id"];


        $pdo->beginTransaction();


        $statement = $pdo->prepare(
            "SELECT
                book_id,
                return_date

             FROM issues

             WHERE id = ?

             FOR UPDATE"
        );


        $statement->execute([$issueId]);

        $issue = $statement->fetch();


        if (
            !$issue ||
            $issue["return_date"] !== null
        ) {

            $pdo->rollBack();

            out(
                false,
                "Invalid return request."
            );
        }


        $statement = $pdo->prepare(
            "UPDATE issues

             SET return_date = CURDATE()

             WHERE id = ?"
        );


        $statement->execute([$issueId]);


        $statement = $pdo->prepare(
            "UPDATE books

             SET available_copies =
                 available_copies + 1

             WHERE id = ?"
        );


        $statement->execute([
            $issue["book_id"]
        ]);


        $pdo->commit();


        out(true, "Book returned successfully.");
    }


    /* =========================
       UNKNOWN ACTION
    ========================== */

    out(false, "Unknown action.");


} catch (Throwable $e) {

    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }


    out(
        false,
        $e->getMessage()
    );
}
