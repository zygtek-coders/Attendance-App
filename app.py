"""
U_D=user_directory
USR=user
"""

from flask import Flask, render_template, request, redirect, url_for, session
import os, json, sys
from datetime import datetime
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = "hackathon_secret"

USERS = "users"
os.makedirs(USERS, exist_ok=True)

# ---------------- UPDATE SERVER ----------------
@app.route("/rst")
def reload():
    """  This funct will restart this server app once called  """
    py=sys.executable
    print(py, *sys.argv)

    os.execv(py,  *sys.argv)

# ---------------- SIGN UP ----------------
@app.route("/signup", methods=["GET", "POST"])
def signup():
    print()
    if request.method == "POST":
        print(f"From client: {request.form}")
        name = request.form["name"].strip().lower()
        email = request.form["email"]
        password = request.form["password"]
        photo = request.files["photo"]

        U_D = os.path.join(USERS, name)

        if os.path.exists(U_D):
            return render_template(
                "signup.html",
                error="User already exists. Choose a different name."
            )

        os.makedirs(U_D)

        # Save photo
        photo_path = os.path.join(U_D, secure_filename(photo.filename))
        photo.save(photo_path)

        # Save info
        info = {
            "name": name,
            "email": email,
            "password": password,
            "join_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        with open(os.path.join(U_D, "info.json"), "w") as ff:
            json.dump(info, ff)

        with open(os.path.join(U_D, "status.txt"), "w") as fl:
            fl.write("signed_up")

        return redirect(url_for("login"))

    return render_template("signup.html")


# ---------------- LOGIN ----------------
@app.route("/", methods=["GET", "POST"])  # login     FREDDY
def login():
    print("Login 2")
    if request.method == "POST":
        name = request.form["name"].strip().lower()
        password = request.form["password"]

        U_D = os.path.join(USERS, name)

        if not os.path.exists(U_D):
            return render_template("login.html", error="User not found")

        with open(os.path.join(U_D, "info.json")) as f:
            info = json.load(f)

        if info["password"] != password:
            return render_template("login.html", error="Wrong password")

        # Mark as watching
        with open(os.path.join(U_D, "status.txt"), "w") as f:
            f.write("watching")

        session["user"] = name
        return redirect(url_for("video"))

    return render_template("login.html")


# ---------------- VIDEO ---------------- ME
@app.route("/video")
def video():
    print("Start watching...")
    if "user" not in session:
        return redirect(url_for("login"))

    return render_template("video.html")


# ---------------- ADMIN ---------------- CERAPHIN
@app.route("/admin")
def admin():
    users = []

    for name in os.listdir(USERS):
        U_D = os.path.join(USERS, name)

        with open(os.path.join(U_D, "info.json")) as f:
            info = json.load(f)

        with open(os.path.join(U_D, "status.txt")) as f:
            status = f.read()

        photo = next(
            (file for file in os.listdir(U_D) if file.endswith((".jpg", ".png"))),
            None
        )

        users.append({
            "name": name,
            "join_time": info["join_time"],
            "status": status,
            "photo": f"/{U_D}/{photo}"
        })

    return render_template("admin.html", users=users)


# ---------------- LOGOUT -------DO WE REALLY NEED THIS  ?  ---------
@app.route("/logout")
def logout():
    print(session)
    USR = session.get("user")

    if USR:
        with open(os.path.join(USERS, USR, "status.txt"), "w") as f:
            f.write("left")

    session.clear()
    return redirect(url_for("login"))


if __name__ == "__main__":
    app.run(debug=True)
