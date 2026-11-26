import { PAPER_WIDTH, elementHeight, renderPaper } from './paper.mjs';

const get = id => document.getElementById(id);
const fields = {'element-text':'text',font:'font','font-size':'size','font-color':'color',alignment:'align','element-x':'x','element-y':'y','element-width':'width','element-height':'height'};

export function mountEditor(onRaster) {
    const canvas = get('preview'), layer = get('elements'), ctx = canvas.getContext('2d');
    let draft = [], selected = null, drag, imageVersion = 0;
    const undo = [], redo = [];
    const snapshot = () => ({draft: draft.map(item => ({...item})), selected});
    const current = () => draft.find(item => item.id === selected);
    function record(state = snapshot()) {
        undo.push(state);
        if (undo.length > 50) undo.shift();
        redo.length = 0;
    }
    function render() {
        const item = current();
        get('properties').hidden = !item;
        get('element-kind').textContent = item?.image ? 'Image' : 'Text';
        get('text-properties').hidden = Boolean(item?.image);
        get('height-field').hidden = !item?.image;
        if (item) for (const [id, prop] of Object.entries(fields)) if (item[prop] !== undefined && document.activeElement !== get(id)) get(id).value = item[prop];
        get('undo').disabled = !undo.length;
        get('redo').disabled = !redo.length;
        let result;
        try {
            result = renderPaper(canvas, draft);
            get('editor-status').textContent = draft.length && !result.sendable ? 'This draft is too large to send.' : '';
        } catch (error) {
            get('editor-status').textContent = error.message;
        }
        canvas.hidden = !result;
        if (result) layer.style.setProperty('--paper-ratio', `${PAPER_WIDTH} / ${canvas.height}`);
        get('export-png').disabled = !result || !draft.length;
        onRaster(result?.sendable ? result.bytes : undefined);
        layer.replaceChildren();
        if (!result) return;
        for (const element of draft) {
            const button = document.createElement('button');
            button.className = 'element';
            button.dataset.id = element.id;
            button.setAttribute('aria-label', element.image ? 'Select image' : `Select text: ${element.text}`);
            button.setAttribute('aria-pressed', element === item);
            Object.assign(button.style, {left: `${element.x / PAPER_WIDTH * 100}%`, width: `${element.width / PAPER_WIDTH * 100}%`, top: `${element.y / canvas.height * 100}%`, height: `${elementHeight(ctx, element) / canvas.height * 100}%`});
            button.addEventListener('pointerdown', event => {
                if (event.button !== 0) return;
                const bounds = button.getBoundingClientRect();
                drag = {id: element.id, x: event.clientX, y: event.clientY, snapshot: snapshot(), scale: PAPER_WIDTH / canvas.getBoundingClientRect().width, resize: element === item && event.clientX >= bounds.right - 14 && event.clientY >= bounds.bottom - 14};
                selected = element.id;
            });
            button.addEventListener('click', () => select(element.id));
            layer.append(button);
        }
    }
    function select(id) {
        selected = id;
        render();
        if (id && matchMedia('(max-width: 799px)').matches) layer.querySelector('[aria-pressed=true]')?.scrollIntoView({block:'nearest'});
    }
    function insert(data) {
        record();
        const y = Math.max(0, ...draft.map(item => item.y + elementHeight(ctx, item)));
        const id = crypto.randomUUID();
        draft.push({id, x: 0, y, width: PAPER_WIDTH, ...data});
        select(id);
    }
    function adjust(item, field, value) {
        if (typeof item[field] === 'number') {
            if (!Number.isFinite(value)) return;
            value = Math.round(value);
            if (field === 'x') value = Math.max(0, Math.min(value, PAPER_WIDTH - item.width));
            if (field === 'y') value = Math.max(0, Math.min(value, 8191));
            if (field === 'width') value = Math.max(16, Math.min(value, PAPER_WIDTH - item.x));
            if (field === 'height') value = Math.max(16, Math.min(value, 8192));
            if (field === 'size') value = Math.max(8, Math.min(value, 96));
        }
        item[field] = value;
        if (item.image && field === 'width') item.height = Math.max(1, Math.round(value * item.image.height / item.image.width));
    }
    for (const [id, field] of Object.entries(fields)) get(id).addEventListener('change', () => {
        const item = current();
        if (!item) return;
        const control = get(id);
        const value = typeof item[field] === 'number' ? control.valueAsNumber : control.value;
        if (value !== item[field]) { record(); adjust(item, field, value); }
        control.value = item[field];
        render();
    });
    window.addEventListener('pointerup', event => {
        if (!drag) return;
        const gesture = drag;
        drag = undefined;
        const dx = (event.clientX - gesture.x) * gesture.scale, dy = (event.clientY - gesture.y) * gesture.scale;
        if (Math.hypot(dx, dy) < 4) return;
        const item = current();
        if (!item || item.id !== gesture.id) return;
        record(gesture.snapshot);
        if (gesture.resize) adjust(item, 'width', item.width + dx);
        else { adjust(item, 'x', item.x + dx); adjust(item, 'y', item.y + dy); }
        select(item.id);
    });
    window.addEventListener('pointercancel', () => { drag = undefined; });
    get('add-text').onclick = () => {
        insert({text:'Text', size:16, font:'sans-serif', color:'#000000', align:'left'});
        get('element-text').focus();
        get('element-text').select();
    };
    get('add-image').onclick = () => get('image').click();
    get('image').onchange = async () => {
        const file = get('image').files[0];
        get('image').value = '';
        if (!file) return;
        const version = ++imageVersion;
        try {
            const image = await createImageBitmap(file);
            if (version !== imageVersion) return image.close();
            insert({image, height: Math.max(1, Math.round(PAPER_WIDTH * image.height / image.width))});
        } catch { get('editor-status').textContent = 'Could not open the image.'; }
    };
    get('close-properties').onclick = () => select(null);
    get('remove-element').onclick = () => { record(); draft = draft.filter(item => item.id !== selected); select(null); };
    get('undo').onclick = () => { if (undo.length) { redo.push(snapshot()); ({draft, selected} = undo.pop()); render(); } };
    get('redo').onclick = () => { if (redo.length) { undo.push(snapshot()); ({draft, selected} = redo.pop()); render(); } };
    get('export-png').onclick = () => canvas.toBlob(blob => {
        if (!blob) return;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'tinyfax.png';
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    });
    get('strip').addEventListener('click', event => { if (event.target === canvas || event.target === layer) select(null); });
    render();
}
