/* Teaching mode: four short guided missions (3-4 minutes each) with a closing question, plus teacher notes.
   Missions drive the real dashboard / Orion; progress is detected from the live app state. English, Arabic, Spanish. */
(function () {
  'use strict';
  var U = window.RCPTUI, T = U.T, esc = U.esc, RC = window.RCPT;
  var lang = function () { return window.RCPTi18n ? window.RCPTi18n.get() : 'en'; };
  var L = function (o) { return o[lang()] || o.en; };
  var done = {}; try { done = JSON.parse(localStorage.getItem('rcpt.teach.done') || '{}'); } catch (e) { }
  var seen = {}; document.addEventListener('rcpt:explain', function (e) { seen[e.detail] = true; });

  var MISSIONS = [
    { id: 'risk', min: 3,
      title: { en: 'Read the Risk Index', ar: 'اقرأ مؤشر الخطر', es: 'Lee el índice de riesgo' },
      goal: { en: 'Learn that R combines three stresses, and that low HRV plus sleep debt can raise risk with no radiation at all.', ar: 'تعلّم أن R يجمع ثلاثة أنواع من الإجهاد، وأن انخفاض HRV مع دَين النوم قد يرفع الخطر دون أي إشعاع.', es: 'Entender que R combina tres tensiones y que HRV baja más deuda de sueño pueden subir el riesgo sin radiación.' },
      discuss: { en: 'Why might a model include sleep at all in a radiation-health tool? What data would you need to check the weights?', ar: 'لماذا قد يضم نموذج صحة الإشعاع عامل النوم؟ وما البيانات اللازمة للتحقق من الأوزان؟', es: '¿Por qué incluir el sueño en una herramienta de salud y radiación? ¿Qué datos harían falta para comprobar los pesos?' },
      setup: function () { RC.setScenario('nominal'); },
      steps: [
        { t: { en: 'Everything is calm: R is low. Drag the HRV slider below 40 ms.', ar: 'كل شيء هادئ وR منخفض. اسحب شريط HRV إلى أقل من 40 مللي ثانية.', es: 'Todo está tranquilo: R es bajo. Arrastra HRV por debajo de 40 ms.' }, hint: { en: 'The HRV slider is in the left sidebar.', ar: 'شريط HRV في الشريط الجانبي.', es: 'El control de HRV está en la barra lateral.' }, check: function (s) { return s.h < 40; } },
        { t: { en: 'R rose although radiation did not change. Press the “? Risk R” button under the bar chart and read how R is built.', ar: 'ارتفع R رغم أن الإشعاع لم يتغير. اضغط زر «? الخطر R» تحت الرسم وافهم كيف يتكوّن R.', es: 'R subió aunque la radiación no cambió. Pulsa el botón «? Risk R» bajo el gráfico y lee cómo se construye R.' }, hint: { en: 'Look for the small round “?” buttons.', ar: 'ابحث عن أزرار «؟» الصغيرة.', es: 'Busca los botones redondos «?».' }, check: function () { return !!seen.R; }, reset: function () { seen.R = false; } },
        { t: { en: 'Now raise sleep debt above 6 hours and watch the Sleep bar.', ar: 'ارفع دَين النوم فوق 6 ساعات وراقب شريط النوم.', es: 'Sube la deuda de sueño por encima de 6 horas y mira la barra de sueño.' }, hint: { en: 'Sleep debt slider is under HRV.', ar: 'شريط دَين النوم تحت HRV.', es: 'El control de deuda de sueño está bajo HRV.' }, check: function (s) { return s.s > 6; } }
      ],
      quiz: { q: { en: 'With the dose near zero, what can still push R into “elevated” (35+)?', ar: 'مع جرعة قريبة من الصفر، ما الذي يمكنه أن يرفع R إلى «مرتفع» (35 فأكثر)؟', es: 'Con dosis casi cero, ¿qué puede llevar R a «elevado» (35+)?' },
        o: [{ en: 'Only a solar storm', ar: 'عاصفة شمسية فقط', es: 'Solo una tormenta solar' }, { en: 'Low HRV together with high sleep debt', ar: 'انخفاض HRV مع دَين نوم مرتفع', es: 'HRV baja junto con mucha deuda de sueño' }, { en: 'Nothing can', ar: 'لا شيء', es: 'Nada puede' }], a: 1,
        why: { en: 'Without radiation, R = 0.35·f_hrv + 0.25·f_sleep. HRV 30 ms gives f_hrv = 57 (→ 20) and 8 h of debt gives f_sleep = 100 (→ 25): R ≈ 45, above 35.', ar: 'دون إشعاع: R = 0.35·f_hrv + 0.25·f_sleep. HRV = 30 يعطي f_hrv = 57 (→ 20) و8 ساعات دَين تعطي f_sleep = 100 (→ 25): R ≈ 45 وهو فوق 35.', es: 'Sin radiación, R = 0.35·f_hrv + 0.25·f_sleep. HRV 30 ms da f_hrv = 57 (→ 20) y 8 h de deuda dan f_sleep = 100 (→ 25): R ≈ 45, sobre 35.' } } },
    { id: 'storm', min: 4,
      title: { en: 'Survive a solar storm', ar: 'انجُ من عاصفة شمسية', es: 'Sobrevive a una tormenta solar' },
      goal: { en: 'See why a storm is an emergency by dose alone, what sheltering does, and what the interval does and does not mean.', ar: 'افهم لماذا تُعد العاصفة طارئة بسبب الجرعة وحدها، وما يفعله الاحتماء، وما يعنيه المجال وما لا يعنيه.', es: 'Ver por qué una tormenta es emergencia solo por la dosis, qué hace el refugio y qué significa (y no) el intervalo.' },
      discuss: { en: 'Which is worse for a crew: a sudden storm with a shelter nearby, or a slow build-up of sleep debt? What would you monitor?', ar: 'أيهما أسوأ للطاقم: عاصفة مفاجئة مع ملجأ قريب أم تراكم بطيء لدَين النوم؟ وماذا ستراقب؟', es: '¿Qué es peor para una tripulación: una tormenta repentina con refugio cerca o una acumulación lenta de deuda de sueño?' },
      setup: function () { RC.setScenario('nominal'); },
      steps: [
        { t: { en: 'Load the storm: press “2 · Acute SPE” in the “Try it in 3 clicks” strip.', ar: 'حمّل العاصفة: اضغط «٢ · عاصفة حادة» في شريط التجربة.', es: 'Carga la tormenta: pulsa «2 · SPE agudo» en la franja «Pruébalo en 3 clics».' }, hint: { en: 'The strip is just under the toolbar.', ar: 'الشريط تحت أزرار الأدوات.', es: 'La franja está bajo la barra de herramientas.' }, check: function (s) { return s.d >= 10; } },
        { t: { en: 'Dose is over 10 mSv/hr, so the tier is Emergency whatever R says. Now “shelter”: drag the dose rate below 4 (the app assumes a shelter cuts it to 20%).', ar: 'الجرعة فوق 10 ملي سيفرت/ساعة فالحالة طوارئ مهما كان R. الآن «احتمِ»: اسحب الجرعة إلى أقل من 4 (يفترض التطبيق أن الملجأ يخفضها إلى 20%).', es: 'La dosis supera 10 mSv/h, así que es emergencia sea cual sea R. Ahora «refúgiate»: baja la dosis de 4 (se supone que el refugio la reduce al 20%).' }, hint: { en: 'Or tell Nova “shelter now”.', ar: 'أو قل لنوفا «احتمِ الآن».', es: 'O dile a Nova «shelter now».' }, check: function (s) { return s.d < 4; } },
        { t: { en: 'Press “? ±CI” under the chart and read what the interval is, and is not.', ar: 'اضغط «? ±CI» تحت الرسم واقرأ ما هو المجال وما ليس هو.', es: 'Pulsa «? ±CI» bajo el gráfico y lee qué es y qué no es el intervalo.' }, hint: { en: 'It is in the row of “?” buttons.', ar: 'ضمن صف أزرار «؟».', es: 'Está en la fila de botones «?».' }, check: function () { return !!seen.ci; }, reset: function () { seen.ci = false; } }
      ],
      quiz: { q: { en: 'Why does the app declare an emergency at 10 mSv/hr even if R is only 40?', ar: 'لماذا يعلن التطبيق الطوارئ عند 10 ملي سيفرت/ساعة حتى لو كان R فقط 40؟', es: '¿Por qué la app declara emergencia a 10 mSv/h aunque R sea solo 40?' },
        o: [{ en: 'Because R is always wrong', ar: 'لأن R خاطئ دائمًا', es: 'Porque R siempre falla' }, { en: 'Because a storm calls for shelter before the body shows strain', ar: 'لأن العاصفة تستدعي الاحتماء قبل أن تظهر آثار الإجهاد', es: 'Porque una tormenta exige refugio antes de que el cuerpo muestre tensión' }, { en: 'Because 10 is a lucky number', ar: 'لأن 10 رقم محظوظ', es: 'Porque 10 es un número de la suerte' }], a: 1,
        why: { en: 'Physiological strain lags behind dose. A dose-rate rule acts first; R then tracks how stressed the crew already is. The 10 mSv/hr threshold is a design choice in this prototype.', ar: 'يتأخر الإجهاد الفسيولوجي عن الجرعة، لذا تتحرك قاعدة معدل الجرعة أولًا ثم يتتبع R مقدار الإجهاد. عتبة 10 اختيار تصميمي في هذا النموذج.', es: 'La tensión fisiológica va por detrás de la dosis. La regla de dosis actúa primero; R refleja el estrés ya acumulado. El umbral de 10 es una decisión de diseño.' } } },
    { id: 'sleep', min: 3,
      title: { en: 'Sleep multiplies dose', ar: 'النوم يضاعف أثر الجرعة', es: 'El sueño multiplica la dosis' },
      goal: { en: 'Understand the non-linear interaction term: it needs both dose and sleep debt (or strain) to be non-zero.', ar: 'افهم حد التفاعل غير الخطي: يتطلب جرعة ودَين نوم (أو إجهادًا) معًا.', es: 'Entender el término de interacción no lineal: necesita dosis y deuda de sueño (o tensión) a la vez.' },
      discuss: { en: 'Is “worse than the sum” a reasonable assumption? How would you test it with real crews?', ar: 'هل «أسوأ من المجموع» افتراض معقول؟ وكيف تختبره مع طواقم حقيقية؟', es: '¿Es razonable «peor que la suma»? ¿Cómo lo probarías con tripulaciones reales?' },
      setup: function () { RC.setScenario('acute_spe'); RC.setInputs({ s: 1 }); },
      steps: [
        { t: { en: 'The storm is on. Raise sleep debt to 8 hours or more.', ar: 'العاصفة قائمة. ارفع دَين النوم إلى 8 ساعات أو أكثر.', es: 'La tormenta está activa. Sube la deuda de sueño a 8 horas o más.' }, hint: { en: 'Drag the sleep slider to the right.', ar: 'اسحب شريط النوم لليمين.', es: 'Arrastra el control de sueño a la derecha.' }, check: function (s) { return s.s >= 8 && s.d >= 10; } },
        { t: { en: 'Press “? Non-Linear Interaction” and read the two product terms.', ar: 'اضغط «? تفاعل غير خطي» واقرأ حدّي الضرب.', es: 'Pulsa «? Interacción no lineal» y lee los dos términos de producto.' }, hint: { en: 'Under the bar chart.', ar: 'تحت الرسم البياني.', es: 'Bajo el gráfico de barras.' }, check: function () { return !!seen.inter; }, reset: function () { seen.inter = false; } },
        { t: { en: 'Set the dose rate to almost zero and look at the Interaction bar.', ar: 'اجعل معدل الجرعة قريبًا من الصفر وانظر إلى شريط التفاعل.', es: 'Pon la dosis casi a cero y mira la barra de interacción.' }, hint: { en: 'Drag the dose slider fully left.', ar: 'اسحب شريط الجرعة لأقصى اليسار.', es: 'Arrastra la dosis del todo a la izquierda.' }, check: function (s) { return s.d < 0.2; } }
      ],
      quiz: { q: { en: 'If the dose rate is zero, what is the interaction term?', ar: 'إذا كان معدل الجرعة صفرًا، فما قيمة حد التفاعل؟', es: 'Si la dosis es cero, ¿cuánto vale el término de interacción?' },
        o: [{ en: 'Zero', ar: 'صفر', es: 'Cero' }, { en: 'Equal to the sleep term', ar: 'يساوي حد النوم', es: 'Igual al término de sueño' }, { en: 'Always 5', ar: 'دائمًا 5', es: 'Siempre 5' }], a: 0,
        why: { en: 'Both product terms contain the dose (0.05·d·s and 0.03·d·f_hrv), so with d = 0 they vanish. The coupling constants are assumptions for illustration.', ar: 'كلا الحدين يحتويان الجرعة (0.05·d·s و0.03·d·f_hrv) فعند d = 0 يختفيان. ثابتا الاقتران افتراضان توضيحيان.', es: 'Ambos productos contienen la dosis (0.05·d·s y 0.03·d·f_hrv), así que con d = 0 desaparecen. Las constantes son supuestos ilustrativos.' } } },
    { id: 'mars', min: 4,
      title: { en: 'Why Mars’s surface beats open space', ar: 'لماذا سطح المريخ أفضل من الفضاء المفتوح', es: 'Por qué la superficie de Marte supera al espacio' },
      goal: { en: 'Link elevation, air overhead and everyday dose, and see which numbers are calibrated and which are assumed.', ar: 'اربط الارتفاع وكمية الهواء فوقك بالجرعة اليومية، وميّز ما هو معايَر وما هو مفترض.', es: 'Relacionar altitud, aire encima y dosis diaria, y distinguir lo calibrado de lo supuesto.' },
      discuss: { en: 'The model underestimates how much the atmosphere matters (see Validation). What would that do to a site-selection decision?', ar: 'النموذج يقلّل من أثر الغلاف الجوي (انظر التحقق). كيف يؤثر ذلك في اختيار موقع الهبوط؟', es: 'El modelo subestima el efecto de la atmósfera (ver Validación). ¿Cómo afectaría a elegir un sitio?' },
      setup: function () { },
      steps: [
        { t: { en: 'Press “Orion” in the toolbar, then choose “Gale Crater” in Quick destinations (Curiosity’s home).', ar: 'اضغط «أوريون» ثم اختر «Gale Crater» من الوجهات السريعة (موقع كيوريوسيتي).', es: 'Pulsa «Orion» y elige «Gale Crater» en destinos rápidos (el hogar de Curiosity).' }, hint: { en: 'Quick destinations are under the map.', ar: 'الوجهات السريعة تحت الخريطة.', es: 'Los destinos rápidos están bajo el mapa.' }, check: function () { var c = window.Orion && window.Orion.current(); return !!(window.Orion && window.Orion.isOpen() && c && Math.abs(c.e.lat + 5.4) < 4 && Math.abs(c.e.lon - 137.8) < 6); } },
        { t: { en: 'Note “mSv/day in the open”. Now pick “Olympus Mons”, the highest ground on Mars, and compare.', ar: 'لاحظ «ملي سيفرت/يوم في العراء». اختر الآن «Olympus Mons» أعلى نقطة في المريخ وقارن.', es: 'Fíjate en «mSv/día al aire libre». Ahora elige «Olympus Mons», el punto más alto de Marte, y compara.' }, hint: { en: 'Higher ground = less air overhead.', ar: 'الأعلى = هواء أقل فوقك.', es: 'Más alto = menos aire encima.' }, check: function () { var c = window.Orion && window.Orion.current(); return !!(window.Orion && window.Orion.isOpen() && c && c.e.h > 15); } },
        { t: { en: 'Finally pick “Hellas floor”, one of the deepest places. Is the dose lower or higher?', ar: 'أخيرًا اختر «Hellas floor» من أعمق المواضع. هل الجرعة أقل أم أعلى؟', es: 'Por último elige «Hellas floor», de los lugares más profundos. ¿La dosis es menor o mayor?' }, hint: { en: 'Deeper ground = more air overhead.', ar: 'الأعمق = هواء أكثر فوقك.', es: 'Más profundo = más aire encima.' }, check: function () { var c = window.Orion && window.Orion.current(); return !!(window.Orion && window.Orion.isOpen() && c && c.e.h < -6); } },
        { t: { en: 'Press the small “?” next to “mSv/day in the open” to see how it is computed and what is calibrated.', ar: 'اضغط «؟» الصغير بجوار «ملي سيفرت/يوم في العراء» لترى كيف يُحسب وما هو المعايَر.', es: 'Pulsa la «?» junto a «mSv/día al aire libre» para ver cómo se calcula y qué está calibrado.' }, hint: { en: 'In the “If an astronaut stays here” card.', ar: 'في بطاقة «إذا بقي رائد فضاء هنا».', es: 'En la tarjeta «Si un astronauta se queda aquí».' }, check: function () { return !!seen.o_gcr; }, reset: function () { seen.o_gcr = false; } }
      ],
      quiz: { q: { en: 'Which spot gets the lowest everyday radiation?', ar: 'أي موضع يتعرض لأقل إشعاع يومي؟', es: '¿Qué lugar recibe menos radiación diaria?' },
        o: [{ en: 'Olympus Mons summit', ar: 'قمة أوليمبوس مونس', es: 'Cima del Olympus Mons' }, { en: 'Gale Crater', ar: 'فوهة غيل', es: 'Cráter Gale' }, { en: 'Hellas floor', ar: 'قاع هيلاس', es: 'Fondo de Hellas' }], a: 2,
        why: { en: 'More atmosphere overhead means more shielding. In the model: Olympus about 0.89, Gale 0.64 (calibrated to Curiosity), Hellas about 0.60 mSv/day. The real atmosphere effect is probably stronger than the model shows.', ar: 'كلما زاد الهواء فوقك زادت الحماية. في النموذج: أوليمبوس ≈ 0.89، غيل 0.64 (معايَر وفق كيوريوسيتي)، هيلاس ≈ 0.60 ملي سيفرت/يوم. الأثر الحقيقي للغلاف الجوي على الأرجح أقوى.', es: 'Más atmósfera encima = más blindaje. En el modelo: Olympus ≈ 0,89, Gale 0,64 (calibrado con Curiosity), Hellas ≈ 0,60 mSv/día. El efecto real de la atmósfera probablemente es mayor.' } } }
  ];

  var card, cur = null, pollT = null, stepIdx = 0, doneStep = [];
  function mkCard() {
    card = document.createElement('div'); card.id = 'tc'; card.hidden = true; card.setAttribute('role', 'region'); card.setAttribute('aria-label', 'Teaching mission'); card.setAttribute('aria-live', 'polite');
    document.body.appendChild(card);
    card.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return; var a = b.getAttribute('data-a');
      if (a === 'exit') end(false); else if (a === 'hint') { card.querySelector('.hint').hidden = false; b.hidden = true; } else if (a === 'skip') advance(); else if (a === 'next') advance();
      else if (a === 'ans') answer(+b.getAttribute('data-i'));
    });
  }
  function dots() { return '<div class="dots" aria-hidden="true">' + cur.steps.map(function (s, i) { return '<i class="' + (doneStep[i] ? 'ok' : i === stepIdx ? 'on' : '') + '"></i>'; }).join('') + '<i class="' + (stepIdx >= cur.steps.length ? 'on' : '') + '"></i></div>'; }
  function renderStep() {
    var st = cur.steps[stepIdx]; if (st.reset) st.reset();
    card.innerHTML = '<h4>' + esc(T('b_teach', 'Teach')) + ' · ' + esc(L(cur.title)) + ' · ' + (stepIdx + 1) + '/' + cur.steps.length + '</h4>' + dots() + '<p>' + esc(L(st.t)) + '</p><p class="hint" hidden>💡 ' + esc(L(st.hint)) + '</p><div class="acts"><button type="button" data-a="hint">' + esc(T('hint', 'Hint')) + '</button><button type="button" data-a="skip">' + esc(T('skip', 'Skip')) + '</button><button type="button" data-a="exit">' + esc(T('close', 'Close')) + '</button></div>';
  }
  function renderQuiz() {
    var q = cur.quiz; card.innerHTML = '<h4>' + esc(L(cur.title)) + ' · ?</h4>' + dots() + '<p><b>' + esc(L(q.q)) + '</b></p><div class="q">' + q.o.map(function (o, i) { return '<label tabindex="0"><button type="button" data-a="ans" data-i="' + i + '" style="all:unset;cursor:pointer;display:block">' + esc(L(o)) + '</button></label>'; }).join('') + '</div><div class="acts"><button type="button" data-a="exit">' + esc(T('close', 'Close')) + '</button></div>';
  }
  function answer(i) {
    var q = cur.quiz, ok = i === q.a, labs = card.querySelectorAll('.q label');
    labs.forEach(function (l, k) { l.className = k === q.a ? 'good' : (k === i ? 'bad' : ''); l.querySelector('button').disabled = true; });
    card.querySelector('.q').insertAdjacentHTML('afterend', '<p><b>' + (ok ? '✓ ' : '✗ ') + '</b>' + esc(L(q.why)) + '</p><div class="acts"><button type="button" class="go" data-a="exit">' + esc(T('done', 'Done')) + '</button></div>');
    done[cur.id] = { ok: ok, at: new Date().toISOString() }; try { localStorage.setItem('rcpt.teach.done', JSON.stringify(done)); } catch (e) { }
    if (window.RCPTHist) window.RCPTHist.add({ kind: 'lesson', title: 'Mission: ' + cur.title.en, note: ok ? 'Quiz answered correctly.' : 'Quiz answered incorrectly; explanation shown.' });
    if (window.NovaAPI) window.NovaAPI.say(ok ? 'Mission complete. Nicely done.' : 'Mission complete. The explanation on screen covers the answer.', { mood: 'happy' });
    document.dispatchEvent(new CustomEvent('rcpt:teach-done', { detail: { id: cur.id, ok: ok } }));
    stopPoll(); if (panel) panel.refresh();
  }
  function advance() { doneStep[stepIdx] = true; stepIdx++; if (stepIdx >= cur.steps.length) { renderQuiz(); stopPoll(); } else renderStep(); }
  function poll() { if (!cur || stepIdx >= cur.steps.length) return; var s = RC.getState(); if (s && cur.steps[stepIdx].check(s)) { var i = stepIdx; setTimeout(function () { if (cur && stepIdx === i) advance(); }, 500); stopPoll(); setTimeout(startPoll, 700); } }
  function startPoll() { stopPoll(); pollT = setInterval(poll, 350); }
  function stopPoll() { clearInterval(pollT); pollT = null; }
  function start(id) {
    var m = MISSIONS.filter(function (x) { return x.id === id; })[0]; if (!m) return false;
    end(true); cur = m; stepIdx = 0; doneStep = []; if (!card) mkCard();
    if (panel) panel.close(); if (window.Orion && window.Orion.isOpen() && id !== 'mars') window.Orion.close();
    try { RC.stopSim(); m.setup(); } catch (e) { }
    card.hidden = false; renderStep(); startPoll(); document.dispatchEvent(new CustomEvent('rcpt:teach-start', { detail: id })); return true;
  }
  function end(quiet) { stopPoll(); cur = null; if (card) card.hidden = true; if (!quiet && panel) panel.refresh(); }
  document.addEventListener('rcpt:lang', function () { if (cur && card && !card.hidden) { stepIdx < cur.steps.length ? renderStep() : renderQuiz(); } });

  var panel = U.panel({
    id: 'teachPanel', title: function () { return T('b_teach', 'Teach'); }, tabs: [
      { id: 'missions', key: 'b_teach', label: 'Missions', render: function (el) {
        el.innerHTML = '<h3>' + esc({ en: 'Short guided missions', ar: 'مهمات تعليمية قصيرة', es: 'Misiones guiadas cortas' }[lang()] || 'Short guided missions') + '</h3><p>' + esc({ en: 'Each mission takes 3–4 minutes, runs on the real dashboard, and ends with one question. Use the “?” buttons any time to see how a number is computed. No account, no network.', ar: 'تستغرق كل مهمة 3–4 دقائق وتعمل على اللوحة الحقيقية وتنتهي بسؤال واحد. استخدم أزرار «؟» في أي وقت لترى كيف يُحسب الرقم. دون حساب ودون شبكة.', es: 'Cada misión dura 3–4 minutos, usa el panel real y termina con una pregunta. Usa los botones «?» para ver cómo se calcula un número. Sin cuenta ni red.' }[lang()] || '') + '</p>' +
          MISSIONS.map(function (m) { var d = done[m.id]; return '<div class="card"><div class="row"><b style="font-size:1rem">' + esc(L(m.title)) + '</b><span class="badge2 bd-info">' + m.min + ' min</span>' + (d ? '<span class="badge2 ' + (d.ok ? 'bd-pass' : 'bd-warn') + '">' + (d.ok ? '✓' : '↻') + '</span>' : '') + '</div><p>' + esc(L(m.goal)) + '</p><button type="button" class="b go" data-start="' + m.id + '">' + esc(T('start', 'Start')) + '</button></div>'; }).join('');
        el.querySelectorAll('[data-start]').forEach(function (b) { b.onclick = function () { start(b.getAttribute('data-start')); }; });
      } },
      { id: 'notes', key: 'tn_tab', label: 'Teacher notes', render: function (el) {
        el.innerHTML = '<h3>' + esc({ en: 'Teacher notes', ar: 'ملاحظات للمعلم', es: 'Notas para docentes' }[lang()] || 'Teacher notes') + '</h3><p class="fine">' + esc({ en: 'Suggested for ages 14+. Works offline. Progress is stored only in this browser profile.', ar: 'مناسب لعمر 14 سنة فأكثر. يعمل دون اتصال. يُحفظ التقدم على هذا الجهاز فقط.', es: 'Recomendado a partir de 14 años. Funciona sin conexión. El progreso solo se guarda en este equipo.' }[lang()] || '') + '</p>' +
          MISSIONS.map(function (m) { return '<div class="card"><b>' + esc(L(m.title)) + '</b><p><b>' + esc({ en: 'Learning goal', ar: 'الهدف', es: 'Objetivo' }[lang()] || 'Learning goal') + ':</b> ' + esc(L(m.goal)) + '</p><p><b>' + esc({ en: 'Discuss', ar: 'نقاش', es: 'Debate' }[lang()] || 'Discuss') + ':</b> ' + esc(L(m.discuss)) + '</p></div>'; }).join('') +
          '<p class="fine">' + esc({ en: 'Be clear with students: all values are simulated, the physiological weights are assumptions, and the model is not a medical device. The Validation tab shows where it is wrong; that is part of the lesson.', ar: 'وضّح للطلاب أن جميع القيم محاكاة، وأن أوزان الجزء الفسيولوجي افتراضية، وأن النموذج ليس جهازًا طبيًا. تبيّن لهم لوحة التحقق مواضع الخطأ، وهذا جزء من الدرس.', es: 'Aclara a los alumnos que todo es simulado, que los pesos fisiológicos son supuestos y que el modelo no es un dispositivo médico. La pestaña Validación muestra dónde falla; eso forma parte de la lección.' }[lang()] || '') + '</p>';
      } }]
  });
  document.getElementById('teachBtn').addEventListener('click', function () { panel.open(); });
  window.RCPTTeach = { open: function () { panel.open(); }, start: start, end: end, missions: MISSIONS, isActive: function () { return !!cur; }, done: function () { return done; }, step: function () { return stepIdx; } };
})();
