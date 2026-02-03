"""
U_D=user_directory
USR=user
"""

from flask import Flask, render_template, request, redirect, url_for, session
import os, json, sys
from datetime import datetime
from werkzeug.utils import secure_filename
from pathlib import Path
from flask import send_from_directory


app = Flask(__name__)
app.secret_key = "z-coders"

USERS = "users"
os.makedirs(USERS, exist_ok=True)

VIDIR = "videos"
os.makedirs(VIDIR, exist_ok=True)

def count_watchers():
    count = 0
    for name in os.listdir(USERS):
        status_file = os.path.join(USERS, name, "status.txt")
        if os.path.exists(status_file):
            with open(status_file) as f:
                if f.read().strip() == "watching":
                    count += 1
    return count


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

        pic=open(photo_path,"rb").read()
        ext=Path(photo_path).suffix
        open(f"static/images/{name}{ext}","wb").write(pic)

        print(f"static/images/{name}{ext}")

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
@app.route("/")
def index():
    return redirect(url_for("login"))


# ---------------- LOGIN ----------------
@app.route("/login", methods=["GET", "POST"])
def login():
    print("Login request:", request.form)

    if request.method == "POST":
        name = request.form.get("name")  # matches HTML input
        password = request.form.get("password")

        if not name or not password:
            return render_template("login.html", error="Missing credentials")

        name = name.strip().lower()
        user_dir = os.path.join(USERS, name)

        if not os.path.exists(user_dir):
            return render_template("login.html", error="User not found")

        with open(os.path.join(user_dir, "info.json")) as f:
            info = json.load(f)

        if info["password"] != password:
            return render_template("login.html", error="Wrong password")

        # mark as watching
        with open(os.path.join(user_dir, "status.txt"), "w") as f:
            f.write("watching")

        session["user"] = name
        return redirect(url_for("video"))

    return render_template("login.html")


@app.route("/video/<current_video>")
@app.route("/video", defaults={'current_video': None})
def video(current_video):
    print(current_video)
    if "user" not in session:
        return redirect(url_for("login"))

    # Get all videos in videos folder
    videos = sorted(os.listdir(VIDIR))
    # Filter to only mp4 (or add .mov/.webm if needed)
    videos = [v for v in videos]  #   if v.endswith(".mp4")

    if not videos:
        return "No videos available"

    # If no current_video is specified, play the first
    if current_video not in videos:
        current_video = videos[0]
    print(f"curent: {current_video}, {videos}")

    # Count watchers
    watchers = count_watchers()

    # Determiner la video suivante
    try:
        current_index = videos.index(current_video)
        next_video = videos[(current_index + 1) % len(videos)]
    except ValueError:
        next_video = videos[0]

    return render_template(
        "video.html",
        videos=videos,
        current_video=current_video,
        next_video=next_video,
        watchers=watchers
    )

@app.route("/stream/<filename>")
def stream_video(filename):
    return send_from_directory(
        VIDIR,
        filename,
        as_attachment=False     # we need chunks
    )



# ---------------- ADMIN ---------------- CERAPHIN
@app.route("/admin")
def admin():
    users = []
    active_now = 0
    new_this_month = 0

    current_month = datetime.now().strftime("%Y-%m")

    for name in os.listdir(USERS):
        user_dir = os.path.join(USERS, name)

        info_file = os.path.join(user_dir, "info.json")
        status_file = os.path.join(user_dir, "status.txt")

        if not os.path.exists(info_file):
            continue

        with open(info_file) as f:
            info = json.load(f)

        status = "unknown"
        if os.path.exists(status_file):
            with open(status_file) as f:
                status = f.read().strip()

        if status == "watching":
            active_now += 1

        if info["join_time"].startswith(current_month):
            new_this_month += 1

        # photo = None
        # for file in os.listdir(user_dir):
        #     if file.lower().endswith((".jpg", ".png", ".jpeg")):
        #         photo = f"/{user_dir}/{file}"
        #         break

        photo = None
        for file in os.listdir("static/images/"):
            if file.lower().endswith((".jpg", ".png", ".jpeg")):
                if info["name"] in file:
                    photo = "images/"+file #f"/{user_dir}/{file}"
                    break

        users.append({
            "name": info["name"],
            "email": info["email"],
            "join_time": info["join_time"],
            "status": status,
            "photo": photo
        })
        print(f"users: {users}")

    return render_template(
        "admin.html",
        users=users,
        total_users=len(users),
        active_now=active_now,
        new_month=new_this_month
    )



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

@app.route("/users")
def users():
    watchers = []

    for name in os.listdir(USERS):
        status_file = os.path.join(USERS, name, "status.txt")
        if os.path.exists(status_file):
            with open(status_file) as f:
                if f.read().strip() == "watching":
                    watchers.append(name)

    return {
        "count": len(watchers),
        "watchers": watchers
    }



if __name__ == "__main__":
    app.run(host="0.0.0.0",port=5000,debug=False)
