(function script(config) {
  const canvas = document.getElementById('paper'),
    frame = document.getElementById('paper-frame');
  const back = document.getElementById('zoom-back');
  let paperHeight = config.height || 1430;
  let zoom = 1,
    fit = 1,
    focused = null;
  const post = payload => {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(payload));
  };
  const scale = next => {
    zoom = next;
    canvas.style.transform = 'scale(' + zoom + ')';
    frame.style.width = 1000 * zoom + 'px';
    frame.style.height = paperHeight * zoom + 'px';
    back.hidden = Math.abs(zoom - fit) < 0.02;
    back.style.left = Math.max(10, document.documentElement.clientWidth - 190) + 'px';
    back.style.right = 'auto';
    back.style.width = '176px';
  };
  const positionFocused = () => {
    if (!focused) return;
    const x = parseFloat(focused.style.left) || 0,
      y = parseFloat(focused.style.top) || 0;
    const width = parseFloat(focused.style.width) || 200;
    const top = frame.offsetTop;
    window.scrollTo({
      left: Math.max(0, (x + Math.min(width, 350) / 2) * zoom - document.documentElement.clientWidth / 2),
      top: Math.max(0, top + y * zoom - 75),
      behavior: 'auto'
    });
  };
  const fitPage = () => {
    fit = Math.min(1, (document.documentElement.clientWidth - 20) / 1000);
    if (!focused) scale(fit);
  };
  window.updatePaperLayout = next => {
    paperHeight = next.height;
    canvas.style.height = paperHeight + 'px';
    const svg = canvas.querySelector('.ruling');
    svg.setAttribute('viewBox', '0 0 1000 ' + paperHeight);
    svg.querySelector('rect').setAttribute('height', String(paperHeight));
    const inputs = canvas.querySelectorAll('[data-report-field]');
    next.fields.forEach((field, i) => { inputs[i].style.top = field.y + 'px'; inputs[i].style.height = field.h + 'px'; });
    const rules = svg.querySelectorAll('[data-line-index]');
    next.lines.forEach((line, i) => { rules[i].setAttribute('y1', String(line.y1)); rules[i].setAttribute('y2', String(line.y2)); });
    const labels = svg.querySelectorAll('[data-text-index]');
    next.texts.forEach((text, i) => labels[i].setAttribute('y', String(text.y)));
    const choices = canvas.querySelectorAll('[data-choice-index]');
    next.choices.forEach((choice, i) => choices[i].style.top = choice.y + 'px');
    canvas.querySelectorAll('[data-signature]').forEach(slot=>{
      const field=next.fields.find(f=>f.path===slot.dataset.signature);
      if(field)slot.style.top=(field.y+field.h+8)+'px';
    });
    scale(zoom);
  };
  fitPage();
  window.addEventListener('resize', () => {
    fitPage();
    if (focused) setTimeout(positionFocused, 150);
  });
  back.onclick = () => {
    const y = window.scrollY,
      previous = zoom;
    if (focused) focused.blur();
    focused = null;
    scale(fit);
    window.scrollTo({
      left: 0,
      top: Math.max(0, y * fit / previous),
      behavior: 'smooth'
    });
  };
  document.querySelectorAll('[data-field]').forEach(input => {
    input.addEventListener('focus', () => {
      if (input.dataset.field === 'recipient') return;
      focused = input;
      scale(Math.max(fit, 1.2));
      requestAnimationFrame(positionFocused);
      setTimeout(positionFocused, 350);
    });
    input.addEventListener('input', () => post({
      type: 'field',
      path: input.dataset.field,
      value: input.value
    }));
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && input.tagName !== 'TEXTAREA') {
        event.preventDefault();
        input.blur();
        focused = null;
        scale(fit);
        window.scrollTo({
          left: 0,
          top: parseFloat(input.style.top) * fit,
          behavior: 'smooth'
        });
      }
    });
  });
  const dateButton = document.querySelector('[data-date-picker]');
  let calendar = null;
  const closeCalendar = () => { if (calendar) calendar.remove(); calendar = null; };
  if (dateButton) dateButton.onclick = () => {
    if (calendar) { closeCalendar(); return; }
    const parts = dateButton.textContent.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    const selected = parts ? new Date(+parts[3], +parts[2]-1, +parts[1]) : null;
    const month = selected ? new Date(selected.getFullYear(), selected.getMonth(), 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    calendar = document.createElement('div');
    calendar.className = 'date-calendar';
    calendar.setAttribute('role','dialog');
    calendar.setAttribute('aria-label','Tarih seç');
    const rect = dateButton.getBoundingClientRect();
    const width = Math.min(300, document.documentElement.clientWidth - 20);
    calendar.style.width = width + 'px';
    calendar.style.left = Math.max(10, Math.min(rect.left, document.documentElement.clientWidth-width-10)) + 'px';
    calendar.style.top = (rect.bottom + 6) + 'px';
    const render = () => {
      calendar.textContent = '';
      const header = document.createElement('div'); header.className = 'calendar-header';
      const previous = document.createElement('button'); previous.textContent = '‹'; previous.setAttribute('aria-label','Önceki ay');
      previous.onclick = () => {month.setMonth(month.getMonth()-1);render();};
      const title = document.createElement('strong'); title.textContent = month.toLocaleDateString('tr-TR',{month:'long',year:'numeric'});
      const next = document.createElement('button'); next.textContent = '›'; next.setAttribute('aria-label','Sonraki ay');
      next.onclick = () => {month.setMonth(month.getMonth()+1);render();};
      header.appendChild(previous);header.appendChild(title);header.appendChild(next);calendar.appendChild(header);
      const grid = document.createElement('div');grid.className = 'calendar-grid';
      ['Pt','Sa','Ça','Pe','Cu','Ct','Pz'].forEach(day=>{const label=document.createElement('span');label.textContent=day;grid.appendChild(label);});
      const offset = (month.getDay()+6)%7;
      for(let i=0;i<offset;i++)grid.appendChild(document.createElement('span'));
      const days = new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
      for(let day=1;day<=days;day++){
        const button = document.createElement('button');button.textContent=String(day);
        if(selected && selected.getFullYear()===month.getFullYear() && selected.getMonth()===month.getMonth() && selected.getDate()===day)button.className='selected-day';
        button.onclick = () => {
          const value=String(day).padStart(2,'0')+'.'+String(month.getMonth()+1).padStart(2,'0')+'.'+month.getFullYear();
          dateButton.textContent=value;post({type:'field',path:'date',value});closeCalendar();
        };
        grid.appendChild(button);
      }
      calendar.appendChild(grid);
      const cancel=document.createElement('button');cancel.textContent='Vazgeç';cancel.className='calendar-cancel';cancel.onclick=closeCalendar;calendar.appendChild(cancel);
    };
    render();document.body.appendChild(calendar);
  };
  document.addEventListener('click', event => {
    if(calendar && !calendar.contains(event.target) && event.target!==dateButton)closeCalendar();
  });
  window.addEventListener('scroll',closeCalendar);
  window.addEventListener('resize',closeCalendar);
  window.updateReportDate = value => { if (dateButton) dateButton.textContent = value || ''; };
  let data = config.data;
  let signatureDialog=null;
  const validSignature=value=>typeof value==='string'&&value.length<=300000&&(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value)||value==='');
  const paintSignature=(role,value)=>{
    const slot=document.querySelector('[data-signature="'+role+'"]');
    if(!slot)return;
    slot.textContent='';
    if(value){const image=document.createElement('img');image.src=value;image.alt=(role==='manufacturer'?'İmalatçı':'Kontrolcü')+' imzası';slot.appendChild(image);}
    else if(config.editable)slot.textContent='İmza ekle';
  };
  window.updateReportSignatures=values=>['manufacturer','controller'].forEach(role=>{
    const value=values[role+'Signature']||'';
    if(validSignature(value)){data[role+'Signature']=value;paintSignature(role,value);}
  });
  document.querySelectorAll('[data-signature]').forEach(slot=>{
    if(!config.editable)return;
    slot.onclick=()=>{
      if(signatureDialog)return;
      if(document.activeElement)document.activeElement.blur();
      const role=slot.dataset.signature,key=role+'Signature';
      const overlay=document.createElement('div');overlay.className='signature-overlay';signatureDialog=overlay;
      overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
      overlay.setAttribute('aria-label',(role==='manufacturer'?'İmalatçı':'Kontrolcü')+' imzası');
      const panel=document.createElement('div');panel.className='signature-panel';
      panel.innerHTML='<h2>'+(role==='manufacturer'?'İmalatçı':'Kontrolcü')+' imzası</h2><p>Parmağınızla veya kalemle aşağıya imza atın.</p><canvas class="signature-pad" width="1000" height="420" aria-label="İmza çizim alanı"></canvas><p class="signature-error" role="alert"></p><div class="signature-actions"><button type="button" data-signature-command="clear">Temizle</button><button type="button" data-signature-command="cancel">Vazgeç</button><button type="button" class="signature-save" data-signature-command="save">Kaydet</button></div>';
      overlay.appendChild(panel);document.body.appendChild(overlay);
      // Android WebView can pan the visual viewport independently of the layout viewport.
      const viewport=window.visualViewport;
      const positionDialog=()=>{
        if(!viewport)return;
        overlay.style.left=viewport.offsetLeft+'px';overlay.style.top=viewport.offsetTop+'px';
        overlay.style.width=viewport.width+'px';overlay.style.height=viewport.height+'px';
        overlay.style.right='auto';overlay.style.bottom='auto';
      };
      positionDialog();
      if(viewport){viewport.addEventListener('resize',positionDialog);viewport.addEventListener('scroll',positionDialog);}
      const pad=panel.querySelector('canvas'),ctx=pad.getContext('2d'),error=panel.querySelector('.signature-error');
      const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
      let ink=false,drawing=false,changed=false,pointer=null,loading=!!data[key];
      const close=()=>{if(viewport){viewport.removeEventListener('resize',positionDialog);viewport.removeEventListener('scroll',positionDialog);}document.body.style.overflow=previousOverflow;overlay.remove();signatureDialog=null;slot.focus();};
      overlay.closeSignature=close;
      ctx.strokeStyle='#000';ctx.fillStyle='#000';ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';
      if(data[key]){const image=new Image();image.onload=()=>{if(!changed){ctx.drawImage(image,0,0,pad.width,pad.height);ink=true;}loading=false;};image.onerror=()=>{loading=false;};image.src=data[key];}
      const point=event=>{const rect=pad.getBoundingClientRect();return {x:(event.clientX-rect.left)*pad.width/rect.width,y:(event.clientY-rect.top)*pad.height/rect.height};};
      pad.onpointerdown=event=>{if(loading||drawing)return;event.preventDefault();pointer=event.pointerId;pad.setPointerCapture(pointer);drawing=true;changed=true;ink=true;error.textContent='';const p=point(event);ctx.beginPath();ctx.arc(p.x,p.y,1.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(p.x,p.y);};
      pad.onpointermove=event=>{if(!drawing||event.pointerId!==pointer)return;event.preventDefault();const p=point(event);ctx.lineTo(p.x,p.y);ctx.stroke();};
      const stop=event=>{if(event.pointerId===pointer){drawing=false;pointer=null;}};
      pad.onpointerup=stop;pad.onpointercancel=stop;
      panel.querySelector('[data-signature-command="clear"]').onclick=()=>{ctx.clearRect(0,0,pad.width,pad.height);ink=false;changed=true;loading=false;error.textContent='';};
      panel.querySelector('[data-signature-command="cancel"]').onclick=close;
      panel.querySelector('[data-signature-command="save"]').onclick=()=>{
        if(loading||drawing)return;
        if(!ink&&!data[key]){error.textContent='Lütfen önce imzanızı atın.';return;}
        const value=ink?pad.toDataURL('image/png'):'';
        if(!validSignature(value)){error.textContent='İmza kaydedilemedi. Temizleyip yeniden deneyin.';return;}
        data[key]=value;paintSignature(role,value);post({type:'signature',path:key,value});close();
      };
      panel.querySelector('[data-signature-command="cancel"]').focus();
    };
  });
  const read = path => path.split('.').reduce((v, k) => v === null || v === void 0 ? void 0 : v[k], data);
  const set = (path, value) => {
    const keys = path.split('.');
    let target = data;
    keys.slice(0, -1).forEach(key => target = target[key]);
    target[keys[keys.length - 1]] = value;
  };
  const paint = () => document.querySelectorAll('[data-choice]').forEach(button => {
    const value = read(button.dataset.path),
      label = button.dataset.value;
    const selected = button.dataset.multi === 'true' ? Array.isArray(value) && value.includes(label) : value === label;
    button.setAttribute('aria-checked', String(selected));
    button.querySelector('.box').textContent = selected ? '✓' : button.dataset.code;
  });
  document.querySelectorAll('[data-choice]').forEach(button => button.onclick = () => {
    const path = button.dataset.path,
      label = button.dataset.value,
      value = read(path);
    const next = button.dataset.multi === 'true' ? Array.isArray(value) && value.includes(label) ? value.filter(v => v !== label) : [...(Array.isArray(value) ? value : []), label] : value === label ? '' : label;
    set(path, next);
    paint();
    post({
      type: 'choice',
      path,
      value: next
    });
  });
  let expandedMedia = false;
  let currentMedia = [];
  const mediaUrl = asset => {
    const uri = asset.uri || '';
    return /^(file:\/\/|content:\/\/|data:image\/)/i.test(uri) ? uri : '';
  };
  const openMedia = index => {
    const asset = currentMedia[index];
    if (!asset) return;
    const viewer = document.createElement('div');
    viewer.className = 'media-viewer';
    viewer.setAttribute('role', 'dialog');
    viewer.setAttribute('aria-label', 'Ek önizleme');
    const video = (asset.type || '').startsWith('video');
    const content = document.createElement(video ? 'video' : 'img');
    content.src = mediaUrl(asset);
    if (video) { content.controls = true; content.playsInline = true; }
    else content.alt = 'Fotoğraf ' + (index + 1);
    const close = document.createElement('button');
    close.textContent = 'Kapat ×';
    close.onclick = () => { if (video) content.pause(); viewer.remove(); };
    const label = document.createElement('span');
    label.textContent = (index + 1) + ' / ' + currentMedia.length;
    viewer.appendChild(content); viewer.appendChild(close); viewer.appendChild(label);
    document.body.appendChild(viewer);
  };
  const showMedia = media => {
    currentMedia = media;
    const list = document.getElementById('media-list');
    if (!list) return;
    list.textContent = '';
    media.slice(0, expandedMedia ? 40 : 10).forEach((asset, i) => {
      const tile = document.createElement('div');
      tile.className = 'media-tile';
      const open = document.createElement('button');
      open.className = 'media-open';
      open.setAttribute('aria-label', 'Eki aç ' + (i + 1));
      const video = (asset.type || '').startsWith('video');
      const thumbnail = document.createElement(video ? 'video' : 'img');
      thumbnail.src = mediaUrl(asset) + (video ? '#t=0.1' : '');
      if (video) { thumbnail.muted = true; thumbnail.preload = 'metadata'; thumbnail.playsInline = true; }
      else { thumbnail.alt = 'Fotoğraf ' + (i + 1); thumbnail.loading = 'lazy'; }
      open.appendChild(thumbnail);
      open.onclick = () => openMedia(i);
      tile.appendChild(open);
      if (video) {
        const badge = document.createElement('span'); badge.className = 'media-play'; badge.textContent = '▶'; tile.appendChild(badge);
      }
      if (config.editable) {
        const remove = document.createElement('button');
        remove.className = 'media-remove'; remove.textContent = '×';
        remove.setAttribute('aria-label', 'Eki sil ' + (i + 1));
        remove.onclick = () => post({type:'action', action:'remove-media', index:i});
        tile.appendChild(remove);
      }
      list.appendChild(tile);
    });
    if (!expandedMedia && media.length > 10) {
      const tile = document.createElement('div'); tile.className = 'media-tile';
      const more = document.createElement('button'); more.className = 'media-more';
      more.textContent = '+' + (media.length - 10);
      more.setAttribute('aria-label', 'Diğer ekleri göster');
      more.onclick = () => { expandedMedia = true; showMedia(currentMedia); };
      tile.appendChild(more); list.appendChild(tile);
    } else if (expandedMedia && media.length > 10) {
      const less = document.createElement('button'); less.className = 'media-collapse'; less.textContent = 'Daha az göster';
      less.onclick = () => { expandedMedia = false; showMedia(currentMedia); }; list.appendChild(less);
    }
    const count = document.getElementById('media-count');
    if (count) count.textContent = media.length + ' / 40 ek';
  };
  window.updateReportMedia = showMedia;
  showMedia(data.media || []);
  const recipientSelect=document.getElementById('recipient-choice');
  const recipientInput=document.querySelector('[data-field="recipient"]');
  const recipientStatus=document.getElementById('recipient-status');
  let recipientDialog=null,savedRecipients=[];
  const recipientNode=(tag,className,text)=>{
    const node=document.createElement(tag);node.className=className;
    if(text!==undefined)node.textContent=text;
    return node;
  };
  const recipientEmails=value=>Array.from(new Set(String(value||'').split(',').map(email=>email.trim().toLowerCase()).filter(Boolean)));
  const validRecipient=email=>email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const paintRecipientStatus=()=>{
    if(!recipientStatus||!recipientInput)return;
    const emails=recipientEmails(recipientInput.value);
    recipientStatus.textContent=emails.length?'Son seçilen alıcılar: '+emails.join(', '):'Alıcıları gönder düğmesine basınca seçersiniz. Eklediğiniz adresler bu telefonda saklanır.';
  };
  const openRecipientDialog=()=>{
    if(recipientDialog||!recipientSelect||!recipientInput)return;
    if(document.activeElement)document.activeElement.blur();
    const current=recipientEmails(recipientInput.value);
    let selected=current.slice();
    const custom=current.filter(email=>!savedRecipients.includes(email));
    const overlay=recipientNode('div','recipient-overlay');overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Alıcı seçin');
    const panel=recipientNode('div','recipient-dialog');
    const header=recipientNode('div','recipient-dialog-header');
    header.appendChild(recipientNode('p','recipient-dialog-eyebrow','E-POSTA'));
    header.appendChild(recipientNode('h2','','Kime gönderilsin?'));
    header.appendChild(recipientNode('p','recipient-dialog-description','Kayıtlı adresleri seçin veya yeni adres ekleyin. Yeni adresler bu telefonda saklanır.'));
    const summary=recipientNode('p','recipient-dialog-summary','');header.appendChild(summary);
    const closeButton=recipientNode('button','recipient-dialog-close','×');closeButton.type='button';closeButton.setAttribute('aria-label','Kapat');header.appendChild(closeButton);panel.appendChild(header);
    const list=recipientNode('div','recipient-dialog-list');list.setAttribute('role','group');list.setAttribute('aria-label','E-posta alıcıları');
    const editor=recipientNode('div','recipient-dialog-custom');
    const customLabel=recipientNode('label','','E-posta ekle');customLabel.setAttribute('for','recipient-dialog-input');editor.appendChild(customLabel);
    const customInput=recipientNode('input','recipient-dialog-custom-input');customInput.id='recipient-dialog-input';customInput.type='email';customInput.multiple=true;customInput.setAttribute('inputmode','email');customInput.setAttribute('enterkeyhint','done');customInput.setAttribute('spellcheck','false');customInput.value='';customInput.placeholder='ornek@firma.com';customInput.setAttribute('aria-label','E-posta ekle');customInput.setAttribute('autocapitalize','none');customInput.setAttribute('autocomplete','off');const addRow=recipientNode('div','recipient-add-row');addRow.appendChild(customInput);
    const addButton=recipientNode('button','recipient-add','Ekle');addButton.type='button';addRow.appendChild(addButton);editor.appendChild(addRow);
    panel.appendChild(editor);panel.appendChild(list);
    const error=recipientNode('p','recipient-dialog-error','');error.setAttribute('role','alert');panel.appendChild(error);
    const footer=recipientNode('div','recipient-dialog-footer');
    const clear=recipientNode('button','recipient-clear','Temizle');clear.type='button';
    const cancel=recipientNode('button','','Vazgeç');cancel.type='button';
    const apply=recipientNode('button','recipient-apply','Mail uygulamasında aç');apply.type='button';
    footer.appendChild(clear);footer.appendChild(cancel);footer.appendChild(apply);panel.appendChild(footer);
    overlay.appendChild(panel);document.body.appendChild(overlay);recipientDialog=overlay;
    const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';recipientSelect.setAttribute('aria-expanded','true');
    const viewport=window.visualViewport;
    const positionDialog=()=>{
      if(!viewport)return;
      overlay.style.left=viewport.offsetLeft+'px';overlay.style.top=viewport.offsetTop+'px';overlay.style.width=viewport.width+'px';overlay.style.height=viewport.height+'px';overlay.style.right='auto';overlay.style.bottom='auto';
      panel.style.maxHeight=Math.max(0,viewport.height-24)+'px';panel.style.height=Math.min(640,Math.max(0,viewport.height-24))+'px';
    };
    positionDialog();if(viewport){viewport.addEventListener('resize',positionDialog);viewport.addEventListener('scroll',positionDialog);}
    const close=()=>{
      if(viewport){viewport.removeEventListener('resize',positionDialog);viewport.removeEventListener('scroll',positionDialog);}
      document.body.style.overflow=previousOverflow;overlay.remove();recipientDialog=null;recipientSelect.setAttribute('aria-expanded','false');recipientSelect.focus();
    };
    overlay.closeRecipient=close;closeButton.onclick=close;cancel.onclick=close;overlay.onclick=event=>{if(event.target===overlay)close();};
    const updateSummary=()=>{
      const count=selected.length;
      summary.textContent=count?count+' alıcı seçildi':'Henüz alıcı seçilmedi';clear.disabled=!count&&!customInput.value;
    };
    customInput.oninput=()=>{error.textContent='';updateSummary();};
    overlay.renderRecipients=()=>{
      const previousScroll=list.scrollTop||0;list.textContent='';
      if(!savedRecipients.length&&!custom.length)list.appendChild(recipientNode('p','recipient-dialog-status','Henüz kayıtlı adres yok. Yukarıdan e-posta ekleyin.'));
      const addChoice=(value,name,email,icon,checked,onToggle,onForget)=>{
        const row=recipientNode('div','recipient-row');
        const button=recipientNode('button','recipient-option');button.type='button';button.dataset.recipientChoice=value;button.setAttribute('role','checkbox');button.setAttribute('aria-checked',String(checked));
        button.appendChild(recipientNode('span','recipient-option-icon',icon));
        const copy=recipientNode('span','recipient-option-copy');copy.appendChild(recipientNode('span','recipient-option-name',name));if(email)copy.appendChild(recipientNode('span','recipient-option-email',email));button.appendChild(copy);button.appendChild(recipientNode('span','recipient-option-mark',checked?'✓':''));button.onclick=onToggle;row.appendChild(button);
        if(onForget){const forget=recipientNode('button','recipient-forget','×');forget.type='button';forget.dataset.recipientForget=value;forget.setAttribute('aria-label',value+' adresini sil');forget.onclick=onForget;row.appendChild(forget);}
        list.appendChild(row);
      };
      const toggle=email=>()=>{selected=selected.includes(email)?selected.filter(value=>value!==email):selected.concat(email);error.textContent='';overlay.renderRecipients();};
      custom.filter(email=>!savedRecipients.includes(email)).forEach(email=>addChoice(email,email,'Yeni adres','+',selected.includes(email),toggle(email)));
      savedRecipients.forEach(email=>addChoice(email,email,'',email.slice(0,1).toLocaleUpperCase('tr-TR'),selected.includes(email),toggle(email),()=>{
        selected=selected.filter(value=>value!==email);post({type:'action',action:'forget-recipient',email});
      }));
      list.scrollTop=previousScroll;updateSummary();
    };
    const addEmails=()=>{
      const extra=recipientEmails(customInput.value);
      if(!extra.length||extra.some(email=>!validRecipient(email))){error.textContent='Geçerli bir e-posta adresi girin.';customInput.focus();return false;}
      const next=recipientEmails(selected.concat(extra).join(','));
      if(next.join(', ').length>4000){error.textContent='Alıcı adresleri için ayrılan alan doldu.';return false;}
      extra.forEach(email=>{if(!custom.includes(email)&&!savedRecipients.includes(email))custom.unshift(email);});
      selected=next;customInput.value='';error.textContent='';overlay.renderRecipients();list.scrollTop=0;return true;
    };
    addButton.onclick=()=>{if(addEmails())customInput.focus();};
    customInput.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();addButton.onclick();}};
    clear.onclick=()=>{selected=[];customInput.value='';error.textContent='';overlay.renderRecipients();};
    apply.onclick=()=>{
      if(customInput.value.trim()&&!addEmails())return;
      if(!selected.length){error.textContent='En az bir alıcı seçin veya e-posta ekleyin.';return;}
      const value=selected.join(', ');
      recipientInput.value=value;post({type:'field',path:'recipient',value});post({type:'action',action:'send',recipient:value});paintRecipientStatus();close();
    };
    overlay.renderRecipients();closeButton.focus();
  };
  window.updateReportRecipients=items=>{
    if(!recipientSelect||!recipientInput)return;
    savedRecipients=recipientEmails((Array.isArray(items)?items:[]).filter(email=>typeof email==='string').join(',')).filter(validRecipient);
    paintRecipientStatus();
    if(recipientDialog)recipientDialog.renderRecipients();
  };
  if(recipientSelect&&recipientInput){recipientSelect.onclick=openRecipientDialog;window.updateReportRecipients([]);}

  document.querySelectorAll('[data-action]').forEach(button => button.onclick = () => {
    var _document$querySelect;
    return post({
      type: 'action',
      action: button.dataset.action,
      recipient: ((_document$querySelect = document.querySelector('[data-field="recipient"]')) === null || _document$querySelect === void 0 ? void 0 : _document$querySelect.value) || ''
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {if(recipientDialog){recipientDialog.closeRecipient();return;}if(signatureDialog){signatureDialog.closeSignature();return;}back.click();}
  });
  paint();
  post({
    type: 'ready'
  });
});
