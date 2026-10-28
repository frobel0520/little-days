"""Real input checks for backups, optional interactions, settings and local metrics."""
import json,time,os,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_smoke import BASE,state,ready,wait,click,place,next_chapter,collect_errors

with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    errors=[];metrics=[]
    context=browser.new_context(viewport={'width':1360,'height':920},accept_downloads=True)
    page=context.new_page();collect_errors(page,errors)
    started=time.monotonic();page.goto(BASE+'/?playtest=1');ready(page)
    metrics.append({'case':'desktop-cold-local','ready_seconds':round(time.monotonic()-started,3)})
    resources=page.evaluate("performance.getEntriesByType('resource').filter(e=>e.name.includes('engine-')).map(e=>({url:new URL(e.name).pathname,bytes:e.encodedBodySize}))")
    assert resources and all(r['url'].endswith('.gz') for r in resources),resources
    place(page,'mug','desk');click(page,'buttons','settings')
    with page.expect_download() as download_info:click(page,'buttons','export')
    backup=json.loads(Path(download_info.value.path()).read_text())
    assert backup['format']=='little-days-backup' and backup['save']['levels']['home']['state']['mug']['surface']=='desk'
    incoming=json.loads(json.dumps(backup));incoming['save']['levels']['home']['state']['book']={'surface':'desk','x':2,'y':2,'orientation':0};incoming['save']['settings']['quality']='low'
    def upload(data):
        with page.expect_file_chooser() as chooser:click(page,'buttons','import')
        chooser.value.set_files({'name':'progress.json','mimeType':'application/json','buffer':json.dumps(data).encode()})
    upload(incoming);wait(page,"s.modal === 'import'")
    assert state(page)['count']==1
    click(page,'buttons','dialog_close');assert state(page)['count']==1
    click(page,'buttons','settings');upload(incoming);wait(page,"s.modal === 'import'");click(page,'buttons','dialog_next');wait(page,"s.modal === '' && s.count === 2")
    assert state(page)['quality']=='low'
    click(page,'buttons','settings');click(page,'buttons','recover');wait(page,"s.modal === 'import'");click(page,'buttons','dialog_next');wait(page,"s.modal === '' && s.count === 1")
    click(page,'buttons','settings');upload({'invalid':True});wait(page,"s.modal === 'notice'");assert state(page)['count']==1
    click(page,'buttons','dialog_close');page.reload();ready(page);assert state(page)['count']==1
    print('PASS actual export/download, import preview/cancel/confirm, recovery, invalid file and reload',flush=True)
    for chapter in ['flowers','books','cafe']:next_chapter(page,chapter)
    place(page,'radio','desk');before=state(page)['state']
    click(page,'buttons','sound');click(page,'buttons','interact');wait(page,'s.interaction_count === 1')
    assert state(page)['state']==before and state(page)['count']==1 and state(page)['ambient_playing']
    page.screenshot(path=str(Path(__file__).resolve().parents[2]/'preview-next-cafe.png'))
    click(page,'buttons','sound')
    wait(page,'!s.audio_playing && !s.ambient_playing')
    page.evaluate("window.dispatchEvent(new Event('blur'))")
    wait(page,'s.suspended && s.frame_limit === 10')
    page.evaluate("window.dispatchEvent(new Event('focus'))")
    wait(page,'!s.suspended && s.frame_limit > 10')
    assert state(page)['state']==before
    print('PASS optional interaction, immediate mute and simulated background/resume without progress changes',flush=True)
    wait(page,'s.frame_sample_count >= 30')
    metrics.append({'case':'desktop-software-webgl','frame_p95_ms':state(page)['frame_p95_ms'],'draw_calls':state(page)['draw_calls'],'frame_samples':state(page)['frame_sample_count']})
    context.close()
    for width,height in [(390,844),(844,390),(360,740),(932,430)]:
        context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=3,is_mobile=True,has_touch=True)
        page=context.new_page();collect_errors(page,errors);page.goto(BASE+'/?playtest=1');ready(page)
        s=state(page);assert s['scene_rect']['h']>=160 and s['scroll']['bottom']-s['scroll']['top']>=60,(width,height,s['scroll'])
        click(page,'buttons','settings');assert state(page)['modal']=='settings'
        click(page,'buttons','quality');wait(page,"s.quality === 'low'");click(page,'buttons','dialog_close')
        page.screenshot(path=str(Path(__file__).resolve().parents[2]/f'preview-next-{width}x{height}.png'))
        wait(page,'s.frame_sample_count >= 30')
        metrics.append({'case':f'{width}x{height}-software-webgl','frame_p95_ms':state(page)['frame_p95_ms'],'draw_calls':state(page)['draw_calls'],'frame_samples':state(page)['frame_sample_count']})
        context.close()
    # Exercise the uncompressed compatibility loader without changing game state.
    fallback=browser.new_context(viewport={'width':1000,'height':800})
    fallback.add_init_script("window.DecompressionStream=undefined")
    page=fallback.new_page();collect_errors(page,errors);page.goto(BASE+'/?playtest=1');ready(page)
    assert page.evaluate("performance.getEntriesByType('resource').filter(e=>e.name.includes('engine-')).every(e=>e.name.endsWith('.bin'))")
    fallback.close()
    print('PASS raw engine compatibility fallback',flush=True)
    assert not errors,errors
    (Path(tempfile.gettempdir())/'little-days-performance.json').write_text(json.dumps({'environment':'cloud Chromium SwiftShader, local server; not physical phone performance','resources':resources,'samples':metrics},indent=2))
    print('PASS four mobile sizes/settings; diagnostic samples saved (not real-device benchmarks)',flush=True)
    browser.close()
