#define MyAppName "المركز الفرنسي"
#define MyAppVersion "1.2.0"
#define MyAppPublisher "المركز الفرنسي"
#define MyAppExeName "تشغيل النظام.bat"

[Setup]
AppId={{C61BBC39-97A4-469D-B43B-30C97004C074}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\Programs\FrenchCenter
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=output
OutputBaseFilename=FrenchCenter-Setup-1.2.0
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
UninstallDisplayName={#MyAppName}
SetupLogging=yes

[Files]
Source: "stage\*"; DestDir: "{app}"; Excludes: "data\main data 2.xlsx,data\usre.xlsx"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "stage\data\main data 2.xlsx"; DestDir: "{app}\data"; Flags: ignoreversion uninsneveruninstall; Check: ShouldInstallRealDatabase
Source: "stage\data\usre.xlsx"; DestDir: "{app}\data"; Flags: onlyifdoesntexist uninsneveruninstall

[Icons]
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{group}\فتح ملف البيانات"; Filename: "{app}\فتح ملف البيانات.bat"; WorkingDir: "{app}"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "تشغيل المركز الفرنسي"; Flags: nowait postinstall skipifsilent

[Code]
function ShouldInstallRealDatabase: Boolean;
begin
  Result := not FileExists(ExpandConstant('{app}\data\real-data-v1.2.0.installed'))
    or not FileExists(ExpandConstant('{app}\data\main data 2.xlsx'));
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  DatabasePath, BackupPath: String;
begin
  Result := '';
  DatabasePath := ExpandConstant('{app}\data\main data 2.xlsx');
  if ShouldInstallRealDatabase and FileExists(DatabasePath) then
  begin
    BackupPath := DatabasePath + '.before-1.2.0-' + GetDateTimeString('yyyymmdd-hhnnss', '-', ':') + '.bak';
    if not FileCopy(DatabasePath, BackupPath, True) then
      Result := 'تعذر حفظ نسخة احتياطية من قاعدة البيانات. أغلق البرنامج وملف Excel ثم أعد التثبيت.';
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
    SaveStringToFile(ExpandConstant('{app}\data\real-data-v1.2.0.installed'), '1.2.0', False);
end;
