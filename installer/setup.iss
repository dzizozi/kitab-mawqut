; Inno Setup script – per-user install, no admin rights needed.
#define AppName "الكتاب الموقوت"
#define AppNameLat "Al-Kitab Al-Mawqut"
#define AppVersion GetEnv("APP_VERSION")
#if AppVersion == ""
  #define AppVersion "1.0.0"
#endif

[Setup]
AppId={{6C0D9B2E-5A1F-4E7B-9F3A-2B8C1D4E7A90}
AppName={#AppName}
AppVerName={#AppName} {#AppVersion}
AppVersion={#AppVersion}
AppPublisher={#AppNameLat}
AppPublisherURL=https://github.com/dzizozi/al-kitab-al-mawqut
DefaultDirName={localappdata}\Programs\AlKitabAlMawqut
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=..\dist
OutputBaseFilename=AlKitabAlMawqut-Setup-{#AppVersion}
SetupIconFile=..\mawaqit\icon.ico
UninstallDisplayIcon={app}\AlKitabAlMawqut.exe
UninstallDisplayName={#AppName} – {#AppNameLat}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
CloseApplications=force
RestartApplications=no
LicenseFile=..\LICENSE

[Languages]
Name: "ar"; MessagesFile: "compiler:Languages\Arabic.isl"
Name: "fr"; MessagesFile: "compiler:Languages\French.isl"
Name: "en"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "..\dist\AlKitabAlMawqut\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#AppName}"; Filename: "{app}\AlKitabAlMawqut.exe"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\AlKitabAlMawqut.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\AlKitabAlMawqut.exe"; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; stop the hidden background process, remove start-with-Windows entry and the old hourly task
Filename: "{sys}\taskkill.exe"; Parameters: "/IM AlKitabAlMawqut.exe /F"; Flags: runhidden; RunOnceId: "KillBg"
Filename: "{sys}\reg.exe"; Parameters: "delete HKCU\Software\Microsoft\Windows\CurrentVersion\Run /v AlKitabAlMawqut /f"; Flags: runhidden; RunOnceId: "DelRun"
Filename: "{sys}\schtasks.exe"; Parameters: "/Delete /TN AlKitabAlMawqut /F"; Flags: runhidden; RunOnceId: "DelTask"
