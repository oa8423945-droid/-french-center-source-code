# Database filename guide

Current database filename: `main data 2.xlsx`.

Do not rename this file by changing only one place. Stop the system first, make a backup of the workbook, rename it in the same `data` folder, then update every runtime, launcher, installer, workflow, and displayed-text reference listed below. Finally start the system and test saving one sample record.

| File or path | Current database filename/reference | What must change | What can break if it is not changed together |
|---|---|---|---|
| `data/main data 2.xlsx` | Physical workbook filename | Rename this workbook to the new exact filename. | The server cannot find a database file. |
| `server.js` | `PRIMARY_DATA_FILE` and fallback use `main data 2.xlsx`. | Update both occurrences to the same new filename. | The API may return “Database file not found” or create/read the wrong file. |
| `start-system.bat` | Checks both `..\\02-قاعدة-البيانات\\main data 2.xlsx` and `data\\main data 2.xlsx`. | Update both paths. | Starting the system can point to a missing or old workbook. |
| `open-data.bat` | Sets/looks up `data\\main data 2.xlsx` and `..\\02-قاعدة-البيانات\\main data 2.xlsx`. | Update both paths. | The “open data” command can open the wrong file or report it missing. |
| `تشغيل النظام.bat` in the operational root (`F:\\codx\\المركز الفرنسي`) | Checks and assigns `GARAGE_DATA_FILE` to `main data 2.xlsx`. | Update the check, the environment-variable path, and the missing-file message. | The root launcher will stop before Node.js starts. |
| `فتح ملف البيانات.bat` in the operational root (`F:\\codx\\المركز الفرنسي`) | Opens `main data 2.xlsx`. | Update the existence check and the Excel path. | Excel opens no file or displays the “not found” message. |
| `installer/FrenchCenter.iss` | Excludes and installs `data\\main data 2.xlsx`. | Update both installer references. | A generated setup can omit the database or overwrite user data incorrectly. |
| `.github/workflows/build-windows-setup.yml` | Includes `data/main data 2.xlsx` in the build inputs/staging. | Update every workflow path reference. | GitHub builds may fail or make a setup without the workbook. |
| `public/index.html` | Shows `main data 2.xlsx` in the side note. | Update the displayed default text. | The screen shows an incorrect database name, although saving may still work. |
| `public/app.js` | Uses the same name as a display fallback and in two save messages. | Update the fallback and both messages. | The UI shows misleading filename information after a save. |
| `README.md` | Documents `data/main data 2.xlsx`. | Update the documented path. | Developers may use the wrong filename when setting up the project. |

`package.json`, `package-lock.json`, CSS, HTML structure, Excel sheet names, Excel headers, and API routes do not use the database filename and do not need to be changed.

Important: `GARAGE_DATA_FILE` can override the default path in `server.js`. If it points to an old filename, the server will still use that old path even after `server.js` is changed. Update or remove that environment-variable assignment in the launcher as part of the same rename.
