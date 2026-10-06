# Database filename

The default database is data/main data 2.xlsx. GARAGE_DATA_FILE overrides the server path. The launch script prefers the database in its own data folder, with the sibling 02-قاعدة-البيانات directory as a fallback.

To rename the default file, stop the server and back it up, then update server.js, تشغيل النظام.bat, فتح ملف البيانات.bat, installer/FrenchCenter.iss, the repository workflow .github/workflows/build-windows-setup.yml, filename references in public/index.html and public/app.js, and the README. Update any explicit GARAGE_DATA_FILE value too.

The installer backs up an existing database before the first 1.2.0 real-data import. Its data/real-data-v1.2.0.installed marker prevents subsequent reinstalls from overwriting operational data.
