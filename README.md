<div dir="rtl">

# الكتاب الموقوت – Al-Kitab Al-Mawqut

﴿إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا﴾

برنامج مجاني ومفتوح المصدر لنظام Windows، يصمّم **ورقة مواقيت الصلاة لشهر هجري كامل** جاهزة للتعليق في المسجد أو البيت، ويطبعها **تلقائياً عند دخول كل شهر هجري**.

![البرنامج](docs/app.jpg)

![التصاميم الثمانية](docs/designs.jpg)

## المزايا
- 8 تصاميم: زجاجي (Glassmorphism)، Neo-brutalism، Bento، سويسري، صلصال (Claymorphism)، واقعي (Skeuomorphism)، Material، Y2K.
- **كل دول العالم**: اختر البلد والمدينة، و22 طريقة حساب معتمدة (رابطة العالم الإسلامي، أم القرى، الهيئة المصرية، ديانت، ISNA، فرنسا، الخليج، ماليزيا، إندونيسيا…)، والعصر الحنفي أو الجمهور.
- **المغرب**: الأوقات الرسمية لوزارة الأوقاف والشؤون الإسلامية (190 مدينة)، وبداية الشهر حسب إعلان الوزارة.
- بداية الشهر الهجري: إعلان الوزارة (المغرب)، أو تقويم أم القرى، أو حساب رؤية الهلال محلياً، مع تعديل ±يوم.
- اسم المسجد وصورته أو شعاره على الورقة، ونص أو دعاء اختياري.
- لغة ثانية على الورقة: الفرنسية أو الإنجليزية.
- المناسبات الدينية، الأيام البيض، ليلة ترقّب الهلال، الأعياد الوطنية (المغرب، الجزائر، تونس، مصر، السعودية، الإمارات، فرنسا)، وتواريخ دخول الشهور القادمة.
- طباعة A4 أو A3، وملف PDF، وطباعة تلقائية اختيارية تعمل في الخلفية دون أي نافذة.
- تعديل يدوي للأوقات بالدقائق لمطابقة توقيت مسجدك.

## التثبيت
1. حمّل الملف `AlKitabAlMawqut-Setup-x.y.z.exe` من صفحة **[Releases](../../releases/latest)**.
2. شغّله واتبع الخطوات (لا يحتاج صلاحيات المدير).
3. افتح «الكتاب الموقوت» من سطح المكتب.

> قد يظهر تنبيه Windows SmartScreen لأن البرنامج غير موقّع رقمياً: اضغط «More info» ثم «Run anyway».

يحتاج البرنامج Windows 10 أو 11 (يستعمل Microsoft Edge WebView2 المثبت مسبقاً).

</div>

---

## Français
Logiciel libre et gratuit pour Windows : il compose la **feuille mensuelle des horaires de prière** (mois de l'Hégire), en 8 styles graphiques, pour n'importe quel pays (22 méthodes de calcul), avec le nom et la photo de la mosquée, et l'imprime **automatiquement au début de chaque mois hégirien** (optionnel, en arrière-plan). Pour le Maroc, horaires officiels du Ministère des Habous.
Téléchargement : page **Releases**.

## English
Free, open-source Windows app that designs a **monthly (Hijri) prayer-time sheet** in 8 visual styles for any country (22 calculation methods, Hanafi/Shafi'i Asr, Umm al-Qura or local moon-sighting calendar), with your mosque's name and logo, and can print it **automatically when each Hijri month begins**. Morocco uses the official Ministry of Habous timetables.
Download the installer from **Releases**.

## Development
```
py -3.11 -m venv .venv
.venv\Scripts\pip install -r requirements.txt pyinstaller
.venv\Scripts\python run.py          # window
.venv\Scripts\python run.py --auto   # background check (used by Task Scheduler)
build.cmd                              # exe + installer (needs Inno Setup 6)
```

## Credits & licenses
- Code: MIT.
- Fonts: Amiri, Noto Kufi/Sans Arabic – SIL Open Font License 1.1.
- Places: [GeoNames](https://www.geonames.org/) – CC BY 4.0.
- Morocco timetables: fetched at run time from habous.gov.ma (Ministry of Habous and Islamic Affairs).
- Hijri Umm al-Qura: [hijridate](https://github.com/dralshehri/hijridate) (MIT). Astronomy: [PyEphem](https://rhodesmill.org/pyephem/) (MIT).
