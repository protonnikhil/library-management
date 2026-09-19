const API = "api/api.php";

const $ = (id) => document.getElementById(id);

let books = [];
let members = [];
let issues = [];


/* ==============================
   API FUNCTION
============================== */

async function api(action, data = {}, method = "POST") {

    try {

        const options = {
            method: method,
            headers: {
                "Content-Type": "application/json"
            }
        };

        if (method !== "GET") {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(
            `${API}?action=${encodeURIComponent(action)}`,
            options
        );

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || "Something went wrong");
        }

        return result;

    } catch (error) {

        console.error(error);

        throw error;
    }
}


/* ==============================
   ESCAPE HTML
============================== */

function escapeHTML(value) {

    return String(value ?? "").replace(
        /[&<>"']/g,

        function (character) {

            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return entities[character];
        }
    );
}


/* ==============================
   TOAST MESSAGE
============================== */

function showToast(message) {

    const toast = $("toast");

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(function () {

        toast.classList.remove("show");

    }, 2500);
}


/* ==============================
   NAVIGATION
============================== */

document.querySelectorAll(".nav-btn").forEach(function (button) {

    button.addEventListener("click", function () {

        document.querySelectorAll(".nav-btn").forEach(function (btn) {

            btn.classList.remove("active");

        });

        button.classList.add("active");


        document.querySelectorAll(".section").forEach(function (section) {

            section.classList.remove("active");

        });


        const sectionName = button.dataset.section;

        $(sectionName).classList.add("active");


        $("pageTitle").textContent = button.textContent.trim();

    });

});


/* ==============================
   LOAD EVERYTHING
============================== */

async function loadAll() {

    try {

        await Promise.all([
            loadDashboard(),
            loadBooks(),
            loadMembers(),
            loadIssues(),
            loadIssueOptions()
        ]);

    } catch (error) {

        showToast(error.message);

    }

}


/* ==============================
   DASHBOARD
============================== */

async function loadDashboard() {

    const result = await api(
        "dashboard",
        {},
        "GET"
    );

    const data = result.data;


    $("totalBooks").textContent =
        data.total_books;

    $("totalMembers").textContent =
        data.total_members;

    $("issuedBooks").textContent =
        data.issued_books;

    $("overdueBooks").textContent =
        data.overdue_books;


    const table = $("recentTransactions");


    if (!data.recent || data.recent.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="5">
                    No transactions yet.
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML = data.recent.map(function (item) {

        const statusClass =
            item.status === "Overdue"
                ? "overdue"
                : item.status === "Returned"
                    ? "returned"
                    : "";


        return `
            <tr>

                <td>
                    ${escapeHTML(item.title)}
                </td>

                <td>
                    ${escapeHTML(item.member_name)}
                </td>

                <td>
                    ${item.issue_date}
                </td>

                <td>
                    ${item.due_date}
                </td>

                <td>

                    <span class="badge ${statusClass}">
                        ${item.status}
                    </span>

                </td>

            </tr>
        `;

    }).join("");

}


/* ==============================
   LOAD BOOKS
============================== */

async function loadBooks() {

    const result = await api(
        "books",
        {},
        "GET"
    );

    books = result.data;

    renderBooks();

}


/* ==============================
   DISPLAY BOOKS
============================== */

function renderBooks() {

    const search =
        $("bookSearch").value
            .toLowerCase()
            .trim();


    const filteredBooks = books.filter(function (book) {

        const text =
            `${book.title}
             ${book.author}
             ${book.isbn}
             ${book.category}`.toLowerCase();


        return text.includes(search);

    });


    const table = $("booksTable");


    if (filteredBooks.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="8">
                    No books found.
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML = filteredBooks.map(function (book) {

        return `
            <tr>

                <td>
                    ${book.id}
                </td>

                <td>
                    ${escapeHTML(book.isbn)}
                </td>

                <td>
                    ${escapeHTML(book.title)}
                </td>

                <td>
                    ${escapeHTML(book.author)}
                </td>

                <td>
                    ${escapeHTML(book.category || "")}
                </td>

                <td>
                    ${book.total_copies}
                </td>

                <td>
                    ${book.available_copies}
                </td>

                <td>

                    <button
                        class="action-btn"
                        onclick="editBook(${book.id})"
                    >
                        Edit
                    </button>


                    <button
                        class="action-btn danger"
                        onclick="deleteBook(${book.id})"
                    >
                        Delete
                    </button>

                </td>

            </tr>
        `;

    }).join("");

}


/* ==============================
   ADD BOOK
============================== */

$("addBookBtn").addEventListener("click", function () {

    openModal(
        "Add New Book",

        [
            {
                label: "ISBN",
                name: "isbn",
                type: "text"
            },

            {
                label: "Book Title",
                name: "title",
                type: "text"
            },

            {
                label: "Author",
                name: "author",
                type: "text"
            },

            {
                label: "Category",
                name: "category",
                type: "text",
                required: false
            },

            {
                label: "Total Copies",
                name: "total_copies",
                type: "number"
            }
        ],

        async function (data) {

            await api(
                "add_book",
                data
            );

            await loadAll();

            showToast("Book added successfully!");

        }

    );

});


/* ==============================
   EDIT BOOK
============================== */

function editBook(id) {

    const book =
        books.find(
            item => item.id == id
        );


    if (!book) {

        showToast("Book not found.");

        return;
    }


    openModal(

        "Edit Book",

        [
            {
                label: "ISBN",
                name: "isbn",
                type: "text",
                value: book.isbn
            },

            {
                label: "Book Title",
                name: "title",
                type: "text",
                value: book.title
            },

            {
                label: "Author",
                name: "author",
                type: "text",
                value: book.author
            },

            {
                label: "Category",
                name: "category",
                type: "text",
                value: book.category,
                required: false
            },

            {
                label: "Total Copies",
                name: "total_copies",
                type: "number",
                value: book.total_copies
            }
        ],

        async function (data) {

            data.id = id;

            await api(
                "edit_book",
                data
            );

            await loadAll();

            showToast("Book updated successfully!");

        }

    );

}


/* ==============================
   DELETE BOOK
============================== */

async function deleteBook(id) {

    const confirmDelete =
        confirm(
            "Are you sure you want to delete this book?"
        );


    if (!confirmDelete) {
        return;
    }


    try {

        await api(
            "delete_book",
            {
                id: id
            }
        );


        await loadAll();

        showToast("Book deleted successfully!");

    } catch (error) {

        showToast(error.message);

    }

}


/* ==============================
   BOOK SEARCH
============================== */

$("bookSearch").addEventListener(
    "input",
    renderBooks
);


/* ==============================
   LOAD MEMBERS
============================== */

async function loadMembers() {

    const result = await api(
        "members",
        {},
        "GET"
    );


    members = result.data;

    renderMembers();

}


/* ==============================
   DISPLAY MEMBERS
============================== */

function renderMembers() {

    const search =
        $("memberSearch").value
            .toLowerCase()
            .trim();


    const filteredMembers =
        members.filter(function (member) {

            const text =
                `${member.name}
                 ${member.email}
                 ${member.phone}`.toLowerCase();


            return text.includes(search);

        });


    const table =
        $("membersTable");


    if (filteredMembers.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="6">
                    No members found.
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        filteredMembers.map(function (member) {

            return `
                <tr>

                    <td>
                        ${member.id}
                    </td>

                    <td>
                        ${escapeHTML(member.name)}
                    </td>

                    <td>
                        ${escapeHTML(member.email)}
                    </td>

                    <td>
                        ${escapeHTML(member.phone)}
                    </td>

                    <td>
                        ${member.joined_date}
                    </td>

                    <td>

                        <button
                            class="action-btn"
                            onclick="editMember(${member.id})"
                        >
                            Edit
                        </button>


                        <button
                            class="action-btn danger"
                            onclick="deleteMember(${member.id})"
                        >
                            Delete
                        </button>

                    </td>

                </tr>
            `;

        }).join("");

}


/* ==============================
   ADD MEMBER
============================== */

$("addMemberBtn").addEventListener(
    "click",

    function () {

        openModal(

            "Add New Member",

            [
                {
                    label: "Full Name",
                    name: "name",
                    type: "text"
                },

                {
                    label: "Email",
                    name: "email",
                    type: "email"
                },

                {
                    label: "Phone",
                    name: "phone",
                    type: "text"
                }
            ],

            async function (data) {

                await api(
                    "add_member",
                    data
                );


                await loadAll();


                showToast(
                    "Member added successfully!"
                );

            }

        );

    }
);


/* ==============================
   EDIT MEMBER
============================== */

function editMember(id) {

    const member =
        members.find(
            item => item.id == id
        );


    if (!member) {

        showToast("Member not found.");

        return;
    }


    openModal(

        "Edit Member",

        [
            {
                label: "Full Name",
                name: "name",
                type: "text",
                value: member.name
            },

            {
                label: "Email",
                name: "email",
                type: "email",
                value: member.email
            },

            {
                label: "Phone",
                name: "phone",
                type: "text",
                value: member.phone
            }
        ],

        async function (data) {

            data.id = id;


            await api(
                "edit_member",
                data
            );


            await loadAll();


            showToast(
                "Member updated successfully!"
            );

        }

    );

}


/* ==============================
   DELETE MEMBER
============================== */

async function deleteMember(id) {

    const confirmDelete =
        confirm(
            "Are you sure you want to delete this member?"
        );


    if (!confirmDelete) {
        return;
    }


    try {

        await api(
            "delete_member",
            {
                id: id
            }
        );


        await loadAll();


        showToast(
            "Member deleted successfully!"
        );

    } catch (error) {

        showToast(error.message);

    }

}


/* ==============================
   MEMBER SEARCH
============================== */

$("memberSearch").addEventListener(
    "input",
    renderMembers
);


/* ==============================
   LOAD ISSUE OPTIONS
============================== */

async function loadIssueOptions() {

    const result =
        await api(
            "options",
            {},
            "GET"
        );


    const data =
        result.data;


    const bookSelect =
        $("issueBook");


    const memberSelect =
        $("issueMember");


    bookSelect.innerHTML =
        `<option value="">
            Select a book
        </option>`;


    data.books.forEach(function (book) {

        const option =
            document.createElement("option");


        option.value = book.id;


        option.textContent =
            `${book.title}
             (${book.available_copies} available)`;


        bookSelect.appendChild(option);

    });


    memberSelect.innerHTML =
        `<option value="">
            Select a member
        </option>`;


    data.members.forEach(function (member) {

        const option =
            document.createElement("option");


        option.value = member.id;


        option.textContent =
            member.name;


        memberSelect.appendChild(option);

    });

}


/* ==============================
   LOAD ISSUE RECORDS
============================== */

async function loadIssues() {

    const result =
        await api(
            "issues",
            {},
            "GET"
        );


    issues = result.data;


    renderIssues();

}


/* ==============================
   DISPLAY ISSUE RECORDS
============================== */

function renderIssues() {

    const table =
        $("issuesTable");


    if (!issues || issues.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="7">
                    No issue records found.
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        issues.map(function (issue) {

            let statusClass = "";


            if (issue.status === "Overdue") {

                statusClass = "overdue";

            } else if (
                issue.status === "Returned"
            ) {

                statusClass = "returned";

            }


            let action = "";


            if (issue.return_date) {

                action = `
                    <span class="badge returned">
                        Returned
                    </span>
                `;

            } else {

                action = `
                    <button
                        class="action-btn"
                        onclick="returnBook(${issue.id})"
                    >
                        Return
                    </button>
                `;

            }


            return `
                <tr>

                    <td>
                        ${issue.id}
                    </td>

                    <td>
                        ${escapeHTML(issue.title)}
                    </td>

                    <td>
                        ${escapeHTML(issue.member_name)}
                    </td>

                    <td>
                        ${issue.issue_date}
                    </td>

                    <td>
                        ${issue.due_date}
                    </td>

                    <td>

                        <span
                            class="badge ${statusClass}"
                        >
                            ${issue.status}
                        </span>

                    </td>

                    <td>
                        ${action}
                    </td>

                </tr>
            `;

        }).join("");

}


/* ==============================
   ISSUE BOOK
============================== */

$("issueForm").addEventListener(
    "submit",

    async function (event) {

        event.preventDefault();


        const bookId =
            $("issueBook").value;


        const memberId =
            $("issueMember").value;


        const dueDate =
            $("dueDate").value;


        if (!bookId || !memberId || !dueDate) {

            showToast(
                "Please fill all fields."
            );

            return;
        }


        try {

            await api(
                "issue",
                {
                    book_id: bookId,
                    member_id: memberId,
                    due_date: dueDate
                }
            );


            event.target.reset();


            setDefaultDueDate();


            await loadAll();


            showToast(
                "Book issued successfully!"
            );

        } catch (error) {

            showToast(
                error.message
            );

        }

    }
);


/* ==============================
   RETURN BOOK
============================== */

async function returnBook(id) {

    const confirmReturn =
        confirm(
            "Mark this book as returned?"
        );


    if (!confirmReturn) {
        return;
    }


    try {

        await api(
            "return_book",
            {
                id: id
            }
  
