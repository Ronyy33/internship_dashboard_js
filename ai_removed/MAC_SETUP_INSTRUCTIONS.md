# Setting up the Internship DB

Because you changed the default MySQL password on your Mac, you need to follow these two steps to get the internship data to show up.

## Step 1: Tell the app your new password

1. Open `internship_db_setup.js`
2. Open `seed_db.js`
3. On line 6 of both files, you will see `password: 'D!et0fuck',`. Change `'D!et0fuck'` to whatever your new MySQL password is.

## Step 2: Install remaining dependencies

Since your friend downloaded the raw files without the `node_modules` folder, they need to download all the needed Javascript packages first. Have them run this in the `db` folder:

```bash
npm install
```

## Step 3: Run the database creation scripts

You need to run these two commands in your terminal (inside the `db` folder) to create the schema and generate the initial student/internship data:

```bash
# 1. This creates the internship_db and all empty tables (students, faculty, internships, applications)
node internship_db_setup.js

# 2. This fills the tables with 35+ realistic internship posts, student profiles, and pre-submitted applications
node seed_db.js
```

After doing this, you can start the server (`node server.js`) and log in at `http://localhost:3000` to see all the data!
