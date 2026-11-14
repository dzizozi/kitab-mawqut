/* Correspondances hégire — début de chaque mois tel qu'annoncé par le Ministère (observation du croissant).
 * À compléter après chaque annonce : ajouter le mois suivant et fixer la durée (29 ou 30) du mois qui se termine.
 * duree: null = mois en cours, durée pas encore connue. */
window.HIJRI = {
  noms: ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذي القعدة', 'ذي الحجة'],
  mois: [
    // source : config.json de la VM prières (réglage set-mois.php)
    { debut: '2026-09-13', mois: 4, annee: 1448, duree: 30 },
    // source : خطبة الجمعة « خطبة ليوم 11 جمادى الأولى 1448هـ الموافق لـ 23 أكتوبر 2026م »
    { debut: '2026-10-13', mois: 5, annee: 1448, duree: 29 },
    // source : annonce du Ministère « فاتح جمادى الآخرة 1448هـ : الأربعاء 11 نونبر 2026م » (جمادى الأولى = 29 jours)
    { debut: '2026-11-11', mois: 6, annee: 1448, duree: null }
  ]
};
