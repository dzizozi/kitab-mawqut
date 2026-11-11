"""Names, occasions and holidays (Arabic + French + English)."""

HIJRI = {
    'ar': ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة',
           'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'],
    'fr': ['Mouharram', 'Safar', 'Rabii I', 'Rabii II', 'Joumada I', 'Joumada II',
           'Rajab', 'Chaabane', 'Ramadan', 'Chawwal', 'Dhou al-Qiida', 'Dhou al-Hijja'],
    'en': ['Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani", 'Jumada al-Ula', 'Jumada al-Akhira',
           'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah'],
}
GREG = {
    'ar_ma': ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر'],
    'ar_dz': ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
    'ar_lv': ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'],
    'ar': ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
    'fr': ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
    'en': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
}


def greg_ar(country):
    if country == 'MA': return GREG['ar_ma']
    if country in ('DZ', 'TN'): return GREG['ar_dz']
    if country in ('SY', 'LB', 'JO', 'PS', 'IQ'): return GREG['ar_lv']
    return GREG['ar']


DAYS = {
    'ar': ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'],
    'fr': ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
    'en': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
}

# (hijri month, day): (ar, fr, en, kind)
HIJRI_EVENTS = {
    (1, 1): ('رأس السنة الهجرية', "Nouvel an de l'Hégire", 'Islamic New Year', 'fete'),
    (1, 10): ('يوم عاشوراء', 'Achoura', 'Ashura', 'relig'),
    (3, 12): ('ذكرى المولد النبوي الشريف', 'Al Mawlid Annabawi', 'Mawlid an-Nabi', 'fete'),
    (7, 1): ('فاتح رجب – من الأشهر الحرم', 'Début de Rajab', 'Start of Rajab', 'relig'),
    (7, 27): ('ذكرى الإسراء والمعراج', 'Al Isra wal Miraj', "Isra' and Mi'raj", 'relig'),
    (8, 15): ('ليلة النصف من شعبان (ليلة 15)', 'Nuit de mi-Chaabane', "Mid-Sha'ban night", 'relig'),
    (9, 1): ('فاتح شهر رمضان المبارك', 'Début du Ramadan', 'First day of Ramadan', 'fete'),
    (9, 26): ('ليلة القدر (ليلة 27) – مساءً', 'Laylat Al Qadr (soir)', 'Laylat al-Qadr (evening)', 'relig'),
    (10, 1): ('عيد الفطر المبارك', 'Aïd Al Fitr', 'Eid al-Fitr', 'fete'),
    (12, 1): ('فاتح ذي الحجة – العشر الأوائل', 'Début de Dhou al-Hijja', 'First of Dhu al-Hijjah', 'relig'),
    (12, 9): ('يوم عرفة', "Jour d'Arafat", 'Day of Arafah', 'relig'),
    (12, 10): ('عيد الأضحى المبارك', 'Aïd Al Adha', 'Eid al-Adha', 'fete'),
}
# Morocco only: second days of feasts are public holidays
HIJRI_EVENTS_MA = {
    (3, 13): ('عيد المولد النبوي (اليوم الثاني)', 'Aïd Al Mawlid (2e jour)', 'Mawlid (2nd day)', 'fete'),
    (10, 2): ('عيد الفطر (اليوم الثاني)', 'Aïd Al Fitr (2e jour)', 'Eid al-Fitr (2nd day)', 'fete'),
    (12, 11): ('عيد الأضحى (اليوم الثاني)', 'Aïd Al Adha (2e jour)', 'Eid al-Adha (2nd day)', 'fete'),
}

# national holidays per country: (month, day): (ar, fr, en)
NATIONAL = {
    'MA': {
        (1, 1): ('رأس السنة الميلادية', 'Nouvel An', "New Year's Day"),
        (1, 11): ('ذكرى تقديم وثيقة الاستقلال', "Manifeste de l'Indépendance", 'Independence Manifesto Day'),
        (1, 14): ('رأس السنة الأمازيغية', 'Nouvel an amazigh', 'Amazigh New Year'),
        (5, 1): ('عيد الشغل', 'Fête du Travail', 'Labour Day'),
        (7, 30): ('عيد العرش', 'Fête du Trône', 'Throne Day'),
        (8, 14): ('ذكرى استرجاع وادي الذهب', 'Oued Eddahab', 'Oued Ed-Dahab Day'),
        (8, 20): ('ذكرى ثورة الملك والشعب', 'Révolution du Roi et du Peuple', 'Revolution of the King and the People'),
        (8, 21): ('عيد الشباب', 'Fête de la Jeunesse', 'Youth Day'),
        (10, 31): ('عيد الوحدة', "Fête de l'Unité", 'Unity Day'),
        (11, 6): ('ذكرى المسيرة الخضراء', 'Marche Verte', 'Green March'),
        (11, 18): ('عيد الاستقلال', "Fête de l'Indépendance", 'Independence Day'),
    },
    'DZ': {(1, 1): ('رأس السنة الميلادية', 'Nouvel An', "New Year's Day"), (1, 12): ('يناير – رأس السنة الأمازيغية', 'Yennayer', 'Yennayer'),
           (5, 1): ('عيد العمال', 'Fête du Travail', 'Labour Day'), (7, 5): ('عيد الاستقلال', "Fête de l'Indépendance", 'Independence Day'),
           (11, 1): ('عيد الثورة', 'Fête de la Révolution', 'Revolution Day')},
    'TN': {(1, 1): ('رأس السنة الميلادية', 'Nouvel An', "New Year's Day"), (3, 20): ('عيد الاستقلال', "Fête de l'Indépendance", 'Independence Day'),
           (4, 9): ('عيد الشهداء', 'Fête des Martyrs', "Martyrs' Day"), (5, 1): ('عيد الشغل', 'Fête du Travail', 'Labour Day'),
           (7, 25): ('عيد الجمهورية', 'Fête de la République', 'Republic Day'), (8, 13): ('عيد المرأة', 'Fête de la Femme', "Women's Day")},
    'EG': {(1, 7): ('عيد الميلاد المجيد', 'Noël copte', 'Coptic Christmas'), (1, 25): ('عيد الشرطة وثورة 25 يناير', 'Révolution du 25 janvier', 'Revolution Day (Jan 25)'),
           (4, 25): ('عيد تحرير سيناء', 'Libération du Sinaï', 'Sinai Liberation Day'), (5, 1): ('عيد العمال', 'Fête du Travail', 'Labour Day'),
           (6, 30): ('ذكرى ثورة 30 يونيو', 'Révolution du 30 juin', 'June 30 Revolution'), (7, 23): ('عيد ثورة 23 يوليو', 'Révolution du 23 juillet', 'Revolution Day (Jul 23)'),
           (10, 6): ('عيد القوات المسلحة', 'Fête des Forces armées', 'Armed Forces Day')},
    'SA': {(2, 22): ('يوم التأسيس', 'Jour de la Fondation', 'Founding Day'), (9, 23): ('اليوم الوطني', 'Fête nationale', 'National Day')},
    'AE': {(12, 2): ('اليوم الوطني', 'Fête nationale', 'National Day'), (12, 1): ('يوم الشهيد', 'Jour du Martyr', "Commemoration Day")},
    'FR': {(1, 1): ('رأس السنة الميلادية', 'Jour de l’An', "New Year's Day"), (5, 1): ('عيد الشغل', 'Fête du Travail', 'Labour Day'),
           (5, 8): ('عيد النصر 1945', 'Victoire 1945', 'Victory in Europe Day'), (7, 14): ('العيد الوطني', 'Fête nationale', 'Bastille Day'),
           (8, 15): ('عطلة 15 غشت', 'Assomption', 'Assumption'), (11, 1): ('عطلة فاتح نونبر', 'Toussaint', "All Saints' Day"),
           (11, 11): ('هدنة 1918', 'Armistice 1918', 'Armistice Day'), (12, 25): ('عيد الميلاد', 'Noël', 'Christmas')},
}

UI = {   # sheet labels
    'title': ('مواقيت الصلاة', 'Horaires de prière', 'Prayer times'),
    'in_city': ('بمدينة', '', ''),
    'day': ('الأيام', 'Jour', 'Day'),
    'hijri': ('', 'Hégire', 'Hijri'),
    'fajr': ('الصبح', 'Fajr', 'Fajr'), 'sunrise': ('الشروق', 'Chourouq', 'Sunrise'), 'dhuhr': ('الظهر', 'Dhuhr', 'Dhuhr'),
    'asr': ('العصر', 'Asr', 'Asr'), 'maghrib': ('المغرب', 'Maghrib', 'Maghrib'), 'isha': ('العشاء', 'Ichaa', 'Isha'),
    'events': ('مناسبات وتذكير', 'Événements du mois', 'Events this month'),
    'next': ('دخول الشهور القادمة', 'Prochains mois (estimation)', 'Next months (estimate)'),
    'white': ('الأيام البيض (13–15)', 'Jours blancs', 'White days'),
    'white_badge': ('الأيام البيض', '', ''),
    'crescent': ('ترقّب هلال %s مساءً', 'Croissant', 'Moon sighting'),
    'unc': ('* اليوم 30 حسب رؤية الهلال', '', ''),
    'calc': ('الأوقات غير المنشورة بعد محسوبة فلكياً (±1 د)', '', ''),
}
