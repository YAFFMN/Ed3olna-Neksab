/* RCPT languages. English is the source; Arabic (right-to-left) and Spanish are included. More can be added with RCPTi18n.addPack({code,name,rtl,strings}).
   Scope in v1.4: dashboard, panels, explanations and teaching missions. Orion site briefings and Nova's free-form answers stay English
   (Nova also understands a small set of Arabic phrases). Missing keys fall back to English. */
(function () {
  var D = {
    en: {
      splash_a: 'Radiation-Coupled', splash_b: 'Physiological Twin', splash_p: 'An offline-first deep-space health system for Artemis and Mars missions.', launch: 'Launch Mission',
      splash_foot: 'NASA Space Apps Challenge 2026 entry · Research prototype, not a medical device · Independent project, not affiliated with or endorsed by NASA',
      sensor: 'Sensor Ingestion Stream', scen: 'Simulation Scenario', sc_nom: 'Nominal Orbit', sc_sleep: 'Sleep Deprived + High Workload', sc_spe: 'Acute Solar Particle Event (SPE)',
      lbl_d: 'Ambient Radiation Rate (mSv/hr)', lbl_h: 'Heart Rate Variability (ms)', lbl_s: 'Cumulative Sleep Debt (hrs)',
      run: '▶ Run 40 h SPE simulation', stop: '■ Stop simulation', clock_manual: 'Mission clock: manual', clock_h: 'Mission clock: hour {h} / 40', clock_onset: ' (SPE onset at 12)', offline: 'OFFLINE LOCAL MODE',
      title: 'Radiation-Coupled Physiological Twin (RCPT)', cap: 'Offline-first deep-space health prototype | Moon-to-Mars crew autonomy concept | all crew data simulated',
      b_demo: '▶ Demo Mode (90 s)', b_orion: '☼ Orion: Mars Atlas & Game (O)', b_debrief: 'Mission Debrief', b_keys: 'Shortcuts (?)', b_about: 'About', b_set: 'Settings',
      b_data: 'Data & Validation', b_crew: 'Crew & Missions', b_teach: 'Teach', b_lang: 'Language',
      path_t: 'Try it in 3 clicks:', j1: '1 · Nominal', j2: '2 · Acute SPE', j3: '3 · Raise sleep debt', jhint: 'Then watch the “Non-Linear Interaction” bar grow (sleep debt × dose).', jhint2: 'Sleep debt is rising. Watch the Non-Linear Interaction bar grow.',
      h_tl: 'Mission Telemetry & Risk Trajectory (40 h simulated SPE)', tl_leg: 'Simulated sensor traces with measurement noise. Shaded band = model CI (−4.2/+4.8). Inputs are assumed, not mission data.',
      h_hm: 'Risk Surface: Dose Rate × HRV', hm_leg: 'Heatmap of R_MRP at current sleep debt. White contours: 35 (elevated) and 70 (emergency). Dot = current state.',
      h_decomp: 'Multi-System Stress Decomposition', h_chips: 'Crew System Status (threshold rules)', h_proto: 'Illustrative Crew Protocols (not medical advice)',
      lat_t: 'Earth one-way latency (Mars, worst case)', lat_s: 'The model and companion run on this device, so no ground approval is needed to act.', lat_ok: 'No ground approval needed',
      foot: 'Weighted-interaction risk model with a fixed −4.2/+4.8 interval · All crew inputs are simulated, not mission measurements · Research prototype, not a medical device · Independent project, not affiliated with or endorsed by NASA.',
      ban_emerg: 'SPE AMBER/RED EMERGENCY MODE ACTIVE | High ', ban_elev: 'ELEVATED PHYSIOLOGICAL STRAIN | ', ban_nom: 'NOMINAL SYSTEM STATE | ', ban_idx: 'Multi-System Risk Index: {r}/100',
      m_risk: 'Multi-System Risk (R_MRP)', m_rad: 'Radiation Rate', m_hrv: 'Heart Rate Variability', m_sleep: 'Sleep Deficit', m_ci: 'CI: [{lo}, {hi}]', m_sim: 'Simulated input', explain: 'Explain', explain_this: 'Explain this number',
      bar_rad: 'Radiation|Impact', bar_hrv: 'Autonomic|Strain (HRV)', bar_sleep: 'Sleep|Debt', bar_int: 'Non-Linear|Interaction',
      chip_cv: 'Cardiovascular', chip_cns: 'Central Nervous', chip_cell: 'Cellular Repair', st_high: 'High Strain', st_stable: 'Stable', st_disr: 'Disrupted', st_nom: 'Nominal', st_comp: 'Compromised', st_opt: 'Optimal',
      p_e_t: 'ACTION REQUIRED: IMMEDIATE RADIATION SHELTERING', p_e_1: 'Move to storm shelter (Water Wall / Central Module).', p_e_2: 'Follow the crew antioxidant countermeasure plan set by the flight surgeon (illustrative).', p_e_3: 'Halt non-essential EVA activities immediately.',
      p_w_t: 'ACTION REQUIRED: WORKLOAD REDUCTION', p_w_1: 'Schedule mandatory 60-minute sleep extension.', p_w_2: 'Increase fluid and electrolyte intake by +500 mL.', p_w_3: 'Lower physical resistance training intensity by 20%.',
      p_n_t: 'NOMINAL OPERATIONS', p_n_1: 'Continue standard exercise routine (ARED / Treadmill).', p_n_2: 'Maintain standard circadian light cycle exposure.', p_n_3: 'All data stays on this device; no ground link is needed.',
      close: 'Close', cancel: 'Cancel', apply: 'Apply', reset: 'Reset', save: 'Save', delete: 'Delete', export: 'Export', import: 'Import', add: 'Add', copy: 'Copy', clear: 'Clear', next: 'Next', back: 'Back', skip: 'Skip', hint: 'Hint', done: 'Done', start: 'Start', play: 'Play', stopb: 'Stop', yes: 'Yes', no: 'No',
      tab_space: 'Space weather', tab_valid: 'Validation', tab_sens: 'Sensitivity', tab_src: 'Sources', tab_terr: 'Terrain',
      tab_crew: 'Crew', tab_scen: 'Scenarios', tab_hist: 'History', tab_lang: 'Languages'
    },
    ar: {
      splash_a: 'التوأم الفسيولوجي', splash_b: 'المقترن بالإشعاع', splash_p: 'نظام صحي للفضاء العميق يعمل دون اتصال، لمهمات أرتميس والمريخ.', launch: 'ابدأ المهمة',
      splash_foot: 'مشاركة في NASA Space Apps Challenge 2026 · نموذج بحثي وليس جهازًا طبيًا · مشروع مستقل لا يتبع ناسا ولا تؤيده',
      sensor: 'تدفق بيانات المستشعرات', scen: 'سيناريو المحاكاة', sc_nom: 'مدار طبيعي', sc_sleep: 'نقص النوم مع عبء عمل مرتفع', sc_spe: 'حدث جسيمات شمسية حاد',
      lbl_d: 'معدل الإشعاع المحيط (ملي سيفرت/ساعة)', lbl_h: 'تقلب معدل ضربات القلب (مللي ثانية)', lbl_s: 'دَين النوم التراكمي (ساعات)',
      run: '▶ شغّل محاكاة العاصفة 40 ساعة', stop: '■ أوقف المحاكاة', clock_manual: 'ساعة المهمة: يدوي', clock_h: 'ساعة المهمة: الساعة {h} / 40', clock_onset: ' (بداية العاصفة عند 12)', offline: 'وضع محلي دون اتصال',
      title: 'التوأم الفسيولوجي المقترن بالإشعاع (RCPT)', cap: 'نموذج صحي للفضاء العميق يعمل دون اتصال | تصور لاستقلالية الطاقم من القمر إلى المريخ | جميع بيانات الطاقم محاكاة',
      b_demo: '▶ وضع العرض (90 ثانية)', b_orion: '☼ أوريون: أطلس المريخ واللعبة (O)', b_debrief: 'ملخص المهمة', b_keys: 'الاختصارات (?)', b_about: 'حول', b_set: 'الإعدادات',
      b_data: 'البيانات والتحقق', b_crew: 'الطاقم والمهمات', b_teach: 'تعلّم', b_lang: 'اللغة',
      path_t: 'جرّبه بثلاث نقرات:', j1: '١ · طبيعي', j2: '٢ · عاصفة حادة', j3: '٣ · ارفع دَين النوم', jhint: 'ثم راقب نمو شريط «التفاعل غير الخطي» (دَين النوم × الجرعة).', jhint2: 'دَين النوم يرتفع. راقب نمو شريط التفاعل غير الخطي.',
      h_tl: 'قياسات المهمة ومسار الخطر (عاصفة محاكاة 40 ساعة)', tl_leg: 'إشارات مستشعرات محاكاة مع ضجيج قياس. النطاق المظلل = مجال ثقة النموذج (−4.2/+4.8). المدخلات مفترضة وليست بيانات مهمة.',
      h_hm: 'سطح الخطر: معدل الجرعة × HRV', hm_leg: 'خريطة حرارية لـ R_MRP عند دَين النوم الحالي. الخطان الأبيضان: 35 (مرتفع) و70 (طوارئ). النقطة = الحالة الحالية.',
      h_decomp: 'تفكيك الإجهاد متعدد الأنظمة', h_chips: 'حالة أنظمة الطاقم (قواعد عتبات)', h_proto: 'بروتوكولات توضيحية للطاقم (ليست نصيحة طبية)',
      lat_t: 'زمن وصول الإشارة إلى الأرض باتجاه واحد (المريخ، أسوأ حالة)', lat_s: 'النموذج والمساعد يعملان على هذا الجهاز، فلا حاجة لموافقة من الأرض.', lat_ok: 'لا حاجة لموافقة من الأرض',
      foot: 'نموذج خطر بتفاعلات موزونة بمجال ثابت −4.2/+4.8 · جميع مدخلات الطاقم محاكاة وليست قياسات مهمة · نموذج بحثي وليس جهازًا طبيًا · مشروع مستقل لا يتبع ناسا ولا تؤيده.',
      ban_emerg: 'وضع طوارئ العاصفة الشمسية (أحمر/كهرماني) | مرتفع ', ban_elev: 'إجهاد فسيولوجي مرتفع | ', ban_nom: 'حالة النظام طبيعية | ', ban_idx: 'مؤشر الخطر متعدد الأنظمة: \u2066{r}/100\u2069',
      m_risk: 'الخطر متعدد الأنظمة (R_MRP)', m_rad: 'معدل الإشعاع', m_hrv: 'تقلب معدل ضربات القلب', m_sleep: 'عجز النوم', m_ci: 'مجال الثقة: \u2066[{lo}, {hi}]\u2069', m_sim: 'مدخل محاكى', explain: 'اشرح', explain_this: 'اشرح هذا الرقم',
      bar_rad: 'أثر|الإشعاع', bar_hrv: 'إجهاد|لاإرادي (HRV)', bar_sleep: 'دَين|النوم', bar_int: 'تفاعل|غير خطي',
      chip_cv: 'القلب والأوعية', chip_cns: 'الجهاز العصبي المركزي', chip_cell: 'الإصلاح الخلوي', st_high: 'إجهاد مرتفع', st_stable: 'مستقر', st_disr: 'مضطرب', st_nom: 'طبيعي', st_comp: 'متأثر', st_opt: 'مثالي',
      p_e_t: 'إجراء مطلوب: الاحتماء الفوري من الإشعاع', p_e_1: 'انتقل إلى ملجأ العواصف (الجدار المائي / الوحدة المركزية).', p_e_2: 'اتبع خطة مضادات الأكسدة التي يحددها طبيب الرحلة (توضيحي).', p_e_3: 'أوقف أنشطة السير الفضائي غير الضرورية فورًا.',
      p_w_t: 'إجراء مطلوب: تخفيف عبء العمل', p_w_1: 'جدولة تمديد إلزامي للنوم لمدة 60 دقيقة.', p_w_2: 'زِد السوائل والأملاح بمقدار 500 مل.', p_w_3: 'خفّض شدة تمارين المقاومة بنسبة 20%.',
      p_n_t: 'عمليات طبيعية', p_n_1: 'واصل برنامج التمرين المعتاد (ARED / جهاز الجري).', p_n_2: 'حافظ على دورة الضوء اليومية المعتادة.', p_n_3: 'تبقى جميع البيانات على هذا الجهاز؛ لا حاجة لاتصال أرضي.',
      close: 'إغلاق', cancel: 'إلغاء', apply: 'تطبيق', reset: 'إعادة ضبط', save: 'حفظ', delete: 'حذف', export: 'تصدير', import: 'استيراد', add: 'إضافة', copy: 'نسخ', clear: 'مسح', next: 'التالي', back: 'رجوع', skip: 'تخطَّ', hint: 'تلميح', done: 'تم', start: 'ابدأ', play: 'تشغيل', stopb: 'إيقاف', yes: 'نعم', no: 'لا',
      tab_space: 'طقس الفضاء', tab_valid: 'التحقق', tab_sens: 'الحساسية', tab_src: 'المصادر', tab_terr: 'التضاريس',
      tab_crew: 'الطاقم', tab_scen: 'السيناريوهات', tab_hist: 'السجل', tab_lang: 'اللغات'
    },
    es: {
      splash_a: 'Gemelo Fisiológico', splash_b: 'Acoplado a la Radiación', splash_p: 'Un sistema de salud para el espacio profundo que funciona sin conexión, para misiones Artemis y a Marte.', launch: 'Iniciar misión',
      splash_foot: 'Proyecto para NASA Space Apps Challenge 2026 · Prototipo de investigación, no es un dispositivo médico · Proyecto independiente, sin relación con la NASA',
      sensor: 'Flujo de sensores', scen: 'Escenario de simulación', sc_nom: 'Órbita nominal', sc_sleep: 'Falta de sueño y carga alta', sc_spe: 'Evento agudo de partículas solares',
      lbl_d: 'Tasa de radiación ambiente (mSv/h)', lbl_h: 'Variabilidad de frecuencia cardíaca (ms)', lbl_s: 'Deuda de sueño acumulada (h)',
      run: '▶ Simular tormenta de 40 h', stop: '■ Detener simulación', clock_manual: 'Reloj de misión: manual', clock_h: 'Reloj de misión: hora {h} / 40', clock_onset: ' (inicio de la tormenta en 12)', offline: 'MODO LOCAL SIN CONEXIÓN',
      title: 'Gemelo Fisiológico Acoplado a la Radiación (RCPT)', cap: 'Prototipo de salud para el espacio profundo, sin conexión | Autonomía de tripulación Luna-Marte | todos los datos de la tripulación son simulados',
      b_demo: '▶ Modo demo (90 s)', b_orion: '☼ Orion: atlas y juego de Marte (O)', b_debrief: 'Informe de misión', b_keys: 'Atajos (?)', b_about: 'Acerca de', b_set: 'Ajustes',
      b_data: 'Datos y validación', b_crew: 'Tripulación y misiones', b_teach: 'Aprender', b_lang: 'Idioma',
      path_t: 'Pruébalo en 3 clics:', j1: '1 · Nominal', j2: '2 · SPE agudo', j3: '3 · Subir deuda de sueño', jhint: 'Luego mira crecer la barra de «Interacción no lineal» (deuda de sueño × dosis).', jhint2: 'La deuda de sueño sube. Mira crecer la barra de interacción no lineal.',
      h_tl: 'Telemetría de misión y trayectoria de riesgo (SPE simulado de 40 h)', tl_leg: 'Trazas de sensores simuladas con ruido. Banda = IC del modelo (−4,2/+4,8). Las entradas son supuestas, no datos de misión.',
      h_hm: 'Superficie de riesgo: tasa de dosis × HRV', hm_leg: 'Mapa de calor de R_MRP con la deuda de sueño actual. Contornos blancos: 35 (elevado) y 70 (emergencia). Punto = estado actual.',
      h_decomp: 'Descomposición del estrés multisistema', h_chips: 'Estado de sistemas de la tripulación (reglas de umbral)', h_proto: 'Protocolos ilustrativos (no son consejo médico)',
      lat_t: 'Latencia unidireccional a la Tierra (Marte, peor caso)', lat_s: 'El modelo y el compañero funcionan en este dispositivo, así que no hace falta aprobación desde tierra.', lat_ok: 'No se necesita aprobación desde tierra',
      foot: 'Modelo de riesgo con interacciones ponderadas e intervalo fijo −4,2/+4,8 · Todas las entradas de la tripulación son simuladas · Prototipo de investigación, no es un dispositivo médico · Proyecto independiente, sin relación con la NASA.',
      ban_emerg: 'MODO DE EMERGENCIA POR TORMENTA SOLAR | Alto ', ban_elev: 'TENSIÓN FISIOLÓGICA ELEVADA | ', ban_nom: 'ESTADO NOMINAL | ', ban_idx: 'Índice de riesgo multisistema: {r}/100',
      m_risk: 'Riesgo multisistema (R_MRP)', m_rad: 'Tasa de radiación', m_hrv: 'Variabilidad cardíaca', m_sleep: 'Déficit de sueño', m_ci: 'IC: [{lo}, {hi}]', m_sim: 'Entrada simulada', explain: 'Explicar', explain_this: 'Explicar este número',
      bar_rad: 'Impacto de|radiación', bar_hrv: 'Tensión|autónoma (HRV)', bar_sleep: 'Deuda|de sueño', bar_int: 'Interacción|no lineal',
      chip_cv: 'Cardiovascular', chip_cns: 'Sistema nervioso central', chip_cell: 'Reparación celular', st_high: 'Tensión alta', st_stable: 'Estable', st_disr: 'Alterado', st_nom: 'Nominal', st_comp: 'Comprometida', st_opt: 'Óptima',
      p_e_t: 'ACCIÓN REQUERIDA: REFUGIO INMEDIATO CONTRA RADIACIÓN', p_e_1: 'Ir al refugio de tormentas (muro de agua / módulo central).', p_e_2: 'Seguir el plan antioxidante fijado por el cirujano de vuelo (ilustrativo).', p_e_3: 'Detener de inmediato las EVA no esenciales.',
      p_w_t: 'ACCIÓN REQUERIDA: REDUCIR CARGA DE TRABAJO', p_w_1: 'Programar una extensión obligatoria de sueño de 60 minutos.', p_w_2: 'Aumentar líquidos y electrolitos en 500 mL.', p_w_3: 'Reducir un 20% la intensidad del entrenamiento de resistencia.',
      p_n_t: 'OPERACIONES NOMINALES', p_n_1: 'Continuar la rutina de ejercicio habitual (ARED / cinta).', p_n_2: 'Mantener el ciclo de luz circadiano habitual.', p_n_3: 'Los datos se quedan en este dispositivo; no se necesita enlace con tierra.',
      close: 'Cerrar', cancel: 'Cancelar', apply: 'Aplicar', reset: 'Restablecer', save: 'Guardar', delete: 'Borrar', export: 'Exportar', import: 'Importar', add: 'Añadir', copy: 'Copiar', clear: 'Vaciar', next: 'Siguiente', back: 'Atrás', skip: 'Omitir', hint: 'Pista', done: 'Listo', start: 'Empezar', play: 'Reproducir', stopb: 'Parar', yes: 'Sí', no: 'No',
      tab_space: 'Clima espacial', tab_valid: 'Validación', tab_sens: 'Sensibilidad', tab_src: 'Fuentes', tab_terr: 'Terreno',
      tab_crew: 'Tripulación', tab_scen: 'Escenarios', tab_hist: 'Historial', tab_lang: 'Idiomas'
    }
  };
  var META = { en: { name: 'English', rtl: false }, ar: { name: 'العربية', rtl: true }, es: { name: 'Español', rtl: false } };
  var lang = 'en';
  try { var sv = localStorage.getItem('rcpt.lang'); if (sv) lang = sv; } catch (e) { }
  try { var pk = JSON.parse(localStorage.getItem('rcpt.langpacks') || '[]'); pk.forEach(function (p) { register(p, true); }); } catch (e) { }
  if (!D[lang]) lang = 'en';

  function register(p, quiet) {
    if (!p || !/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(p.code || '') || !p.strings || typeof p.strings !== 'object') throw new Error('language pack needs {code, name, rtl, strings}');
    var clean = {}; Object.keys(p.strings).forEach(function (k) { if (typeof p.strings[k] === 'string' && p.strings[k].length < 600) clean[k] = p.strings[k]; });
    D[p.code] = Object.assign(D[p.code] || {}, clean); META[p.code] = { name: String(p.name || p.code).slice(0, 30), rtl: !!p.rtl };
    return p.code;
  }
  function t(k, f, p) {
    var s = (D[lang] && D[lang][k]) || D.en[k] || f || k;
    if (p) s = s.replace(/\{(\w+)\}/g, function (m, n) { return p[n] != null ? p[n] : m; });
    return s;
  }
  function apply() {
    var root = document.documentElement; root.lang = lang; root.dir = META[lang].rtl ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach(function (n) { n.textContent = t(n.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-attr]').forEach(function (n) { n.getAttribute('data-i18n-attr').split(';').forEach(function (pair) { var a = pair.split(':'); n.setAttribute(a[0], t(a[1])); }); });
    var sel = document.getElementById('langSel'); if (sel) sel.value = lang;
  }
  function set(l) {
    if (!D[l]) return false; lang = l; try { localStorage.setItem('rcpt.lang', l); } catch (e) { }
    apply(); document.dispatchEvent(new CustomEvent('rcpt:lang', { detail: l })); return true;
  }
  function addPack(p) {
    var code = register(p);
    try { var arr = JSON.parse(localStorage.getItem('rcpt.langpacks') || '[]').filter(function (x) { return x.code !== code; }); arr.push(p); localStorage.setItem('rcpt.langpacks', JSON.stringify(arr)); } catch (e) { }
    return code;
  }
  window.RCPTi18n = { t: t, set: set, get: function () { return lang; }, isRTL: function () { return META[lang].rtl; }, apply: apply, addPack: addPack,
    extend: function (code, strings) { if (!D[code]) return false; Object.keys(strings).forEach(function (k) { if (typeof strings[k] === 'string') D[code][k] = strings[k]; }); return true; }, langs: function () { return Object.keys(D).map(function (c) { return [c, META[c].name]; }); }, keys: function () { return Object.keys(D.en); }, dict: function (c) { return D[c]; } };
  document.addEventListener('DOMContentLoaded', apply);
})();
