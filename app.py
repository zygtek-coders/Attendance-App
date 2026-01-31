from flask import Flask, render_template, request, redirect, url_for, session
import os, json
from datetime import datetime
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = "hackathon_secret"

BASE_DIR = "users"
os.makedirs(BASE_DIR, exist_ok=True)

# ---------------- SIGN UP ----------------
@app.route("/", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        name = request.form["name"].strip().lower()
        email = request.form["email"]
        password = request.form["password"]
        photo = request.files["photo"]

        user_dir = os.path.join(BASE_DIR, name)

        if os.path.exists(user_dir):
            return render_template(
                "signup.html",
                error="User already exists. Choose a different name."
            )

        os.makedirs(user_dir)

        # Save photo
        photo_path = os.path.join(user_dir, secure_filename(photo.filename))
        photo.save(photo_path)

        # Save info
        info = {
            "name": name,
            "email": email,
            "password": password,
            "join_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        with open(os.path.join(user_dir, "info.json"), "w") as f:
            json.dump(info, f)

        with open(os.path.join(user_dir, "status.txt"), "w") as f:
            f.write("signed_up")

        return redirect(url_for("login"))

    return render_template("signup.html")


# ---------------- LOGIN ----------------
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        name = request.form["name"].strip().lower()
        password = request.form["password"]

        user_dir = os.path.join(BASE_DIR, name)

        if not os.path.exists(user_dir):
            return render_template("login.html", error="User not found")

        with open(os.path.join(user_dir, "info.json")) as f:
            info = json.load(f)

        if info["password"] != password:
            return render_template("login.html", error="Wrong password")

        # Mark as watching
        with open(os.path.join(user_dir, "status.txt"), "w") as f:
            f.write("watching")

        session["user"] = name
        return redirect(url_for("video"))

    return render_template("login.html")


# ---------------- VIDEO ----------------
@app.route("/video")
def video():
    if "user" not in session:
        return redirect(url_for("login"))

    return render_template("video.html")


# ---------------- ADMIN ----------------
@app.route("/admin")
def admin():
    users = []

    for name in os.listdir(BASE_DIR):
        user_dir = os.path.join(BASE_DIR, name)

        with open(os.path.join(user_dir, "info.json")) as f:
            info = json.load(f)

        with open(os.path.join(user_dir, "status.txt")) as f:
            status = f.read()

        photo = next(
            (file for file in os.listdir(user_dir) if file.endswith((".jpg", ".png"))),
            None
        )

        users.append({
            "name": name,
            "join_time": info["join_time"],
            "status": status,
            "photo": f"/{user_dir}/{photo}"
        })

    return render_template("admin.html", users=users)


# ---------------- LOGOUT ----------------
@app.route("/logout")
def logout():
    user = session.get("user")

    if user:
        with open(os.path.join(BASE_DIR, user, "status.txt"), "w") as f:
            f.write("left")

    session.clear()
    return redirect(url_for("login"))


if __name__ == "__main__":
    app.run(debug=True)
