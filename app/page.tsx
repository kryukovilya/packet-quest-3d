'use client';
import {useEffect,useRef,useState} from 'react';
import {WorldScene} from '@/components/world-scene';
import {Package,BookOpen,Lightbulb,Map,Check,RotateCcw,Info,Server,Shield,Archive,Send,Cable,Stamp,Bug,FileText,FileCheck,Power,FolderOpen,X,Volume2,VolumeX,Lock,ArrowRight,Briefcase,Eye,EyeOff} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {command,freshQuest,restoreQuest,itemNames,fragmentText,nextHint} from '@/lib/quest';
import {inspectText,voices} from '@/lib/dialogue';
import {nextDoor} from '@/lib/journey';
import {playSound,unlockAudio,setAudioEnabled,setMusicActive} from '@/lib/sound';
import type {Sound} from '@/lib/sound';
import type {Quest,Room,Item,Fragment,Command} from '@/lib/quest';

const STORE='packet-quest-v1';
const rooms:Record<Room,{name:string;icon:typeof Info}>={corridor:{name:'Коридор',icon:Map},info:{name:'Справочная',icon:Info},server:{name:'Серверная',icon:Server},gate:{name:'Брандмауэр',icon:Shield},archive:{name:'Архив',icon:Archive},dispatch:{name:'Почта',icon:Send}};
const icons:Record<Item,typeof Package>={parcel:Package,pass:FileText,stamp:Stamp,cable:Cable,bug:Bug,bridge:FolderOpen,signed:FileCheck};
const shapes=['●','▲','■'],shapeNames=['круг','треугольник','квадрат'];
export default function Home(){
 const [state,setState]=useState<Quest>(freshQuest),[loaded,setLoaded]=useState(false);
 const [object,setObject]=useState<string|null>(null),[speech,setSpeech]=useState({speaker:'Курьер',text:''});
 const [sideRead,setSideRead]=useState(false);
 const [selected,setSelected]=useState<Item|null>(null),[tray,setTray]=useState<'bag'|'map'|'hint'|null>(null);
 const [journal,setJournal]=useState(false),[restart,setRestart]=useState(false),[motionOff,setMotionOff]=useState(false);
 const [labels,setLabels]=useState(true),[stamping,setStamping]=useState(false),[transitioning,setTransitioning]=useState(false),[talked,setTalked]=useState<string[]>([]);
 const [walkRequest,setWalkRequest]=useState<{id:string;serial:number}|undefined>(undefined),[reaction,setReaction]=useState<{id:string;serial:number}|undefined>(undefined);
 const destination=useRef<Room|null>(null),serial=useRef(0),stampingRef=useRef(false);
 const [sound,setSound]=useState(true),[saving,setSaving]=useState(true),[gain,setGain]=useState(''),[sending,setSending]=useState(false);
 const [socket,setSocket]=useState<number|null>(null),[removed,setRemoved]=useState<number[]>([]),[hintLevel,setHintLevel]=useState(0);
 const ref=useRef(state),soundRef=useRef(sound),sendingRef=useRef(sending),visits=useRef<Record<string,number>>({});
 ref.current=state;soundRef.current=sound;sendingRef.current=sending;
 const soundEffect=(kind:Sound)=>{if(soundRef.current)playSound(kind);};
 const gesture=()=>{if(soundRef.current)unlockAudio();};
 useEffect(()=>{try{const raw=localStorage.getItem(STORE);if(raw){const saved=restoreQuest(JSON.parse(raw));if(saved)setState(saved);else setGain('Начинаем новый рейс: сохранение повреждено.');}const prefs=JSON.parse(localStorage.getItem('packet-quest-preferences')||'{}');if(typeof prefs.sound==='boolean')setSound(prefs.sound);if(typeof prefs.labels==='boolean')setLabels(prefs.labels);if(typeof prefs.motionOff==='boolean')setMotionOff(prefs.motionOff);}catch{setSaving(false);}setLoaded(true);},[]);
 useEffect(()=>{if(loaded)try{localStorage.setItem(STORE,JSON.stringify(state));localStorage.setItem('packet-quest-preferences',JSON.stringify({sound,motionOff,labels}));}catch{setSaving(false);}},[state,loaded,sound,motionOff,labels]);
 useEffect(()=>{if(!gain)return;const id=setTimeout(()=>setGain(''),3200);return()=>clearTimeout(id);},[gain]);
 useEffect(()=>setHintLevel(0),[state.fragments.length,state.flags.wired,state.flags.gate,state.flags.restored]);
 useEffect(()=>setAudioEnabled(sound),[sound]);
 useEffect(()=>{setMusicActive(state.started&&!state.delivered);return()=>setMusicActive(false);},[state.started,state.delivered]);
 function walkTo(id:string){setObject(null);setTray(null);setWalkRequest({id,serial:++serial.current});}
 function goTo(room:Room){if(room===ref.current.room){setTray(null);return;}destination.current=room;const door=nextDoor(ref.current.room,room);if(door)walkTo(door);}
 useEffect(()=>{const target=destination.current;if(!target)return;if(state.room===target){destination.current=null;return;}const door=nextDoor(state.room,target);if(door)walkTo(door);},[state.room]);
 function reactTo(id:string){setSideRead(true);setReaction({id,serial:++serial.current});const jokes:Record<string,string[]>={pigeon:['Копия загружена. Голубь просит не закрывать окно. Он через него летает.','Облако переполнено. Перейдите на тариф «Два голубя».'],router:['Выключил и включил. Теперь не работает увереннее.','Пароль: «непомню». Подсказка к паролю: тоже не помню.'],frog:['КВА! У меня не баги, а комплексный обед.','КВАлифицированный специалист рекомендует обед.'],extinguisher:['Пшшш! Это временная мера. Серверу всё ещё нужно охлаждение.','Огнетушитель прошёл тест. Теперь очередь вентилятора.'],book:['README прочитан. Достижение: «Первый за всю историю».','В конце инструкции написано: «А теперь попробуйте перезапустить».'],bell:['Дзынь. Пиксель уже здесь. Просто очень похож на сотрудника в отпуске.','Дзынь-дзынь. Доставка звукового уведомления подтверждена.'],mailbox:['Письмо от принца принтеров. Просит три картриджа до зарплаты.','Ваше письмо помечено как «важное». Теперь оно лежит важнее.']};const count=visits.current[id]??0;visits.current[id]=count+1;setSpeech({speaker:speech.speaker,text:(jokes[id]??['Всё работает. Подозрительно.'])[count%2]});soundEffect(id==='frog'?'frog':id==='bell'?'bell':id==='extinguisher'?'power':'tap');}
 function act(c:Command){
  if(sendingRef.current||stampingRef.current)return;
  gesture();const result=command(ref.current,c);
  if(c.type==='use'&&c.item==='stamp'&&result.ok){stampingRef.current=true;setStamping(true);setTray(null);setObject(null);return result;}
  if(c.type==='send'&&result.ok){sendingRef.current=true;setSending(true);setObject(null);setTray(null);soundEffect('send');return result;}
  ref.current=result.state;setState(result.state);
  if(c.type!=='hint'&&c.type!=='append'&&c.type!=='remove'&&c.type!=='wire'&&c.type!=='clear')setSpeech({speaker:voices[result.speaker]??result.speaker,text:result.message});
  if(!result.ok){setGain(result.message);soundEffect('error');}
  else if(c.type==='travel'){setGain('');setObject(null);setTray(null);setSelected(null);setSocket(null);setRemoved([]);soundEffect('door');}
  else if(c.type==='use'&&c.target==='frog')soundEffect('frog');
  else if(c.type==='cool')soundEffect('power');
  else soundEffect(result.gain?'take':'tap');
  if(result.gain)setGain(result.gain);
  if(c.type==='use')setSelected(null);
  return result;
 }
 function inspect(id:string){
  gesture();setSideRead(false);setTalked(list=>list.includes(id)?list:[...list,id]);setTray(null);setObject(id);setSocket(null);setRemoved([]);
  const count=visits.current[id]??0;visits.current[id]=count+1;
  if(selected){act({type:'use',item:selected,target:id});return;}
  setSpeech(inspectText(id,ref.current,count));soundEffect(id==='frog'?'frog':'tap');
 }
 function choose(item:Item){
  if(selected==='stamp'&&item==='pass'||selected==='pass'&&item==='stamp'){act({type:'use',item:'stamp',target:'pass'});setTray(null);return;}
  setSelected(selected===item?null:item);setTray(null);setObject(null);soundEffect('tap');
 }
 function toggleTray(value:'bag'|'map'|'hint'){gesture();setObject(null);setTray(tray===value?null:value);soundEffect('tap');if(value==='hint'&&tray!=='hint')act({type:'hint'});}
 function finishSending(){if(!sendingRef.current)return;const result=command(ref.current,{type:'send'});sendingRef.current=false;setSending(false);ref.current=result.state;setState(result.state);soundEffect('delivered');}
 function finishStamp(){if(!stampingRef.current)return;stampingRef.current=false;setStamping(false);const result=command(ref.current,{type:'use',item:'stamp',target:'pass'});ref.current=result.state;setState(result.state);setSelected(null);setGain('Точка поставлена. Пропуск оформлен.');soundEffect('stamp');}
 function reset(){const s=freshQuest();ref.current=s;setState(s);setObject(null);setTray(null);setSelected(null);setRestart(false);setJournal(false);setGain('');setRemoved([]);setSocket(null);visits.current={};setTalked([]);destination.current=null;}
 const actionRef=useRef(act);actionRef.current=act;
 useEffect(()=>{const ctx=(document as Document&{modelContext?:{registerTool:(t:unknown,o:{signal:AbortSignal})=>unknown}}).modelContext;if(!ctx)return;const controller=new AbortController();
  ctx.registerTool({name:'read_quest_state',description:'Read local adventure progress.',inputSchema:{type:'object',properties:{}},annotations:{readOnlyHint:true},execute:()=>ref.current},{signal:controller.signal});
  ctx.registerTool({name:'perform_quest_action',description:'Perform an adventure action using game rules.',inputSchema:{type:'object',properties:{type:{type:'string'}},required:['type']},annotations:{readOnlyHint:false},execute:(c:Command)=>actionRef.current(c)},{signal:controller.signal});return()=>controller.abort();
 },[]);
 const btn=(label:string,c:Command,Icon:typeof Power=ArrowRight)=><button className="stage-action" onClick={()=>c.type==='travel'&&c.room?goTo(c.room):act(c)}><Icon size={18}/>{label}</button>;
 const has=(item:Item)=>state.items.includes(item);
 const wiring=object==='fan'&&state.flags.wired&&!state.flags.cooled;
 const rebus=object==='cabinet'&&state.flags.restored&&!state.flags.rebus;
 const terminal=object==='terminal';
 const sideDialog=!!object&&['clock','coffee','snail','pigeon','router','extinguisher','book','bell','mailbox'].includes(object);
 const active=state.started&&!state.delivered;
 return <main className="game-app" onPointerDownCapture={gesture} onKeyDownCapture={gesture}>
  <div className="stage-shell">
   <WorldScene state={!state.started?{...state,room:'corridor'}:state} cover={!active} reduceMotion={motionOff} paused={journal||restart||sending||stamping} showLabels={labels} talked={talked} walkRequest={walkRequest} reaction={reaction} addressPrompt={object==='terminal'} onTransition={setTransitioning} stamping={stamping} onStampDone={finishStamp} sending={sending} onSendDone={finishSending} onStep={()=>soundEffect('step')} activeTarget={object} onWalk={()=>{setObject(null);setTray(null);}} onTravel={room=>act({type:'travel',room})} onInspect={inspect} onFragment={(fragment:Fragment)=>{if(state.room==='dispatch'){setObject('terminal');setTray(null);act({type:'append',fragment});}else{setGain('Фрагменты соберём в адрес на почте.');soundEffect('tap');}}}>
    <header className="stage-header"><div className="room-plaque"><span>РЕЙС 404</span><h1>{active?rooms[state.room].name:'Пакет не доставлен'}</h1></div><div className="stage-tools"><button aria-label={labels?'Скрыть подписи':'Показать подписи'} onClick={()=>setLabels(!labels)}>{labels?<Eye/>:<EyeOff/>}</button><button aria-label={sound?'Выключить звук':'Включить звук'} onClick={()=>{if(!sound)unlockAudio();setSound(!sound);}}>{sound?<Volume2/>:<VolumeX/>}</button><button aria-label="Открыть блокнот" onClick={()=>setJournal(true)}><BookOpen/></button></div></header>
    {!state.started&&<section className="start-card welcome-screen" aria-label="Добро пожаловать"><div className="welcome-parcel" aria-hidden="true"><Package size={48}/><span>404</span></div><span className="brass-label">СЛУЖБА ДОСТАВКИ</span><h2>Добро пожаловать<br/>в рейс 404</h2><p>Вы — курьер внутри компьютера. Адрес пакета стёрся. Найдите пять фрагментов, познакомьтесь с местными и доведите доставку до конца.</p><button className="stage-action" disabled={!loaded} onClick={()=>act({type:'start'})}>Начать рейс <ArrowRight size={20}/></button><small>Начните с двери «Справочная». Значки ведут к объектам, меню внизу всегда под рукой.</small></section>}
    {state.delivered&&<section className="ending-card"><span className="delivery-stamp"><Check/> ДОСТАВЛЕНО</span><h2>ИТ.Москва</h2><p>«Получил. А инструкцию, как писать адрес, вы тоже доставляете?»</p><small>— получатель</small><button className="stage-action" onClick={()=>setRestart(true)}><RotateCcw size={18}/>Ещё один рейс</button></section>}
    {active&&<>
     {gain&&!sending&&!stamping&&<div className="stage-toast" role="status">{gain}</div>}
     {object&&!sending&&<section className={`stage-console ${terminal?'puzzle-console terminal-console':wiring||rebus?'puzzle-console':''}`} aria-label="Диалог и действия">
      <div className="console-heading"><b>{wiring?'Охлаждение':rebus?'Картотека':terminal?'Почтовый терминал':speech.speaker}</b><button aria-label="Закрыть действия" onClick={()=>setObject(null)}><X size={19}/></button></div>
      {!wiring&&!rebus&&!terminal&&<p className="dialogue-text" role="status">{speech.text}</p>}
      <div className="console-actions">
       {object==='reset'&&!state.flags.reboot&&btn('Перезапустить бота',{type:'reboot'},Power)}
       {object==='bot'&&!state.flags.reboot&&<button className="stage-action secondary" onClick={()=>walkTo('reset')}>Подойти к кнопке «РЕСТАРТ» <ArrowRight size={17}/></button>}
       {object==='bot'&&state.flags.reboot&&!state.flags.guardVisited&&btn('Узнать правила у охраны',{type:'travel',room:'gate'},Shield)}
       {object==='guard'&&!state.flags.stamped&&btn('Вернуться в справочную',{type:'travel',room:'info'},ArrowRight)}
       {object==='drawer'&&state.flags.guardVisited&&state.flags.reboot&&!has('stamp')&&btn('Взять штамп',{type:'take',item:'stamp'},Stamp)}
       {(object==='drawer'||object==='stampdesk')&&has('stamp')&&!state.flags.stamped&&btn('Поставить точку в пропуске',{type:'use',item:'stamp',target:'pass'},Stamp)}
       {object==='cable'&&!has('cable')&&!state.flags.wired&&btn('Подобрать кабель',{type:'take',item:'cable'},Cable)}
       {object==='fan'&&!state.flags.wired&&has('cable')&&btn('Подключить кабель',{type:'use',item:'cable',target:'fan'},Cable)}
       {object==='guard'&&has('signed')&&!state.flags.gate&&btn('Показать пропуск',{type:'use',item:'signed',target:'guard'},FileCheck)}
       {(object==='guard'||object==='gate')&&state.flags.gate&&btn('Войти в архив',{type:'travel',room:'archive'},Archive)}
       {object==='trash'&&!state.flags.restored&&!has('bridge')&&btn('Восстановить «МОСТ»',{type:'restore'},RotateCcw)}
       {object==='cabinet'&&has('bridge')&&!state.flags.restored&&btn('Вернуть файл в картотеку',{type:'use',item:'bridge',target:'cabinet'},FolderOpen)}
       {object==='frog'&&has('bug')&&btn('Угостить багом',{type:'use',item:'bug',target:'frog'},Bug)}
       {object==='postman'&&<button className="stage-action" onClick={()=>walkTo('terminal')}>Открыть терминал <Send size={18}/></button>}
      {!sideRead&&({pigeon:'Проверить облако',router:'Перезапустить Wi-Fi',frog:'Получить КВАлификацию',extinguisher:'Проверить огнетушитель',book:'Прочитать README',bell:'Позвонить',mailbox:'Открыть спам'} as Record<string,string>)[object]&&<button className="stage-action secondary" onClick={()=>reactTo(object)}>{({pigeon:'Проверить облако',router:'Перезапустить Wi-Fi',frog:'Получить КВАлификацию',extinguisher:'Проверить огнетушитель',book:'Прочитать README',bell:'Позвонить',mailbox:'Открыть спам'} as Record<string,string>)[object]}</button>}
       {sideDialog&&<button className="stage-action secondary" onClick={()=>setObject(null)}>Прочитано <Check size={18}/></button>}
      </div>
      {wiring&&<><p className="puzzle-tip">Соедините одинаковые знаки.</p><div className="wire-grid"><div>{shapes.map((s,i)=><button key={i} aria-label={`Выбрать контакт ${shapeNames[i]}`} aria-pressed={socket===i} className={socket===i?'chosen':''} onClick={()=>{setSocket(i);soundEffect('tap');}}><span>{s}</span><small>{state.links[i]<0?'—':shapes[state.links[i]]}</small></button>)}</div><div className="wire-links">{state.links.map((p,i)=><span key={i} className={p===i?'connected':''}>{p===i?'━━':'┄┄'}</span>)}</div><div>{[2,0,1].map(i=><button key={i} disabled={socket===null} aria-label={`Подключить к разъёму ${shapeNames[i]}`} onClick={()=>{if(socket!==null)act({type:'wire',socket,plug:i});setSocket(null);}}>{shapes[i]}</button>)}</div></div>{btn('Включить охлаждение',{type:'cool'},Power)}</>}
      {rebus&&<><p className="puzzle-tip">МОСТ − Т. Уберите одну букву.</p><div className="letter-row">{'МОСТ'.split('').map((l,i)=><button key={i} aria-label={`${removed.includes(i)?'Вернуть':'Убрать'} букву ${l}`} aria-pressed={removed.includes(i)} className={removed.includes(i)?'removed':''} onClick={()=>{setRemoved(removed.includes(i)?[]:[i]);soundEffect('tap');}}>{l}</button>)}</div>{btn('Проверить',{type:'rebus',letters:'МОСТ'.split('').filter((_,i)=>!removed.includes(i)).join('')},Check)}</>}
      {terminal&&<><div className="address-display" aria-label="Собранный адрес">{state.address.length?state.address.map((f,i)=><button key={f} aria-label={`Убрать ${fragmentText[f]}`} onClick={()=>act({type:'remove',index:i})}>{fragmentText[f]}</button>):<span>АДРЕС НЕ УКАЗАН</span>}</div><p className="puzzle-tip">Нажимайте на фрагменты на борту платформы.</p>{btn('Отправить пакет',{type:'send'},Send)}{state.address.length>0&&<button className="inline-action" onClick={()=>act({type:'clear'})}>Очистить адрес</button>}</>}
     </section>}
     {tray&&<section className={`stage-tray tray-${tray}`} aria-label={tray==='map'?'Карта':tray==='bag'?'Сумка':'Подсказка'}><div className="console-heading"><b>{tray==='map'?'Схема отделов':tray==='bag'?'Сумка курьера':'Тихая подсказка'}</b><button aria-label="Закрыть панель" onClick={()=>setTray(null)}><X size={18}/></button></div>
      {tray==='bag'&&<><div className="bag-items">{state.items.map(item=>{const Icon=icons[item];return <button key={item} aria-pressed={selected===item} onClick={()=>choose(item)}><Icon size={25}/><span>{itemNames[item]}</span></button>;})}</div>{has('stamp')&&!state.flags.stamped&&btn('Штамп → пропуск',{type:'use',item:'stamp',target:'pass'},Stamp)}</>}
      {tray==='map'&&<nav className="room-map">{(Object.keys(rooms) as Room[]).map(room=>{const {icon:Icon,name}=rooms[room];return <button key={room} disabled={room==='archive'&&!state.flags.gate} aria-current={state.room===room?'location':undefined} onClick={()=>goTo(room)}><Icon size={20}/><span>{name}</span>{room==='archive'&&!state.flags.gate&&<Lock size={15}/>}</button>;})}</nav>}
      {tray==='hint'&&<><p className="dialogue-text">{nextHint(state,hintLevel)}</p>{hintLevel===0&&<button className="stage-action secondary" onClick={()=>{setHintLevel(1);act({type:'hint'});}}>Подсказать точнее</button>}</>}
     </section>}
     {selected&&!tray&&<button className="selected-item" aria-label="Отменить выбор предмета" onClick={()=>setSelected(null)}>{itemNames[selected]} <ArrowRight size={14}/> объект <X size={16}/></button>}
     <nav className="stage-dock" aria-label="Инструменты курьера"><button disabled={sending||stamping||transitioning} aria-expanded={tray==='map'} onClick={()=>toggleTray('map')}><Map size={21}/><span>Карта</span></button><button disabled={sending||stamping||transitioning} aria-expanded={tray==='bag'} onClick={()=>toggleTray('bag')}><Briefcase size={22}/><span>Сумка <small>{state.items.length}</small></span></button><button disabled={sending||stamping||transitioning} aria-expanded={tray==='hint'} onClick={()=>toggleTray('hint')}><Lightbulb size={21}/><span>Подсказка</span></button></nav>
    </>}
   </WorldScene>
  </div>
  <Dialog open={journal} onOpenChange={setJournal}><DialogContent className="quest-modal" showCloseButton={false}><div className="console-heading"><DialogTitle>Блокнот курьера</DialogTitle><button aria-label="Закрыть блокнот" onClick={()=>setJournal(false)}><X/></button></div><DialogDescription>Восстановить адрес. Доставить пакет. Не съесть бага.</DialogDescription><ul className="journal-tasks">{[['Перезапустить бота',state.flags.reboot],['Наладить охлаждение',state.flags.cooled],['Оформить пропуск',state.flags.stamped],['Решить ребус и угостить Квасильду',state.flags.rebus&&state.flags.frog],['Доставить пакет',state.delivered]].map(([label,done],i)=><li key={i}><span>{done?<Check size={18}/>:i+1}</span>{label}</li>)}</ul><button className="stage-action secondary" aria-pressed={motionOff} onClick={()=>setMotionOff(!motionOff)}>{motionOff?'Включить анимацию':'Уменьшить движение'}</button>{!saving&&<p>Сохранение недоступно. Прогресс останется до закрытия игры.</p>}<button className="inline-action" onClick={()=>{setJournal(false);setRestart(true);}}>Начать заново</button></DialogContent></Dialog>
  <Dialog open={restart} onOpenChange={setRestart}><DialogContent className="quest-modal" showCloseButton={false}><DialogTitle>Новый рейс?</DialogTitle><DialogDescription>Текущий прогресс будет сброшен.</DialogDescription><button className="stage-action" onClick={reset}>Да, начать заново</button><button className="inline-action" onClick={()=>setRestart(false)}>Продолжить игру</button></DialogContent></Dialog>
 </main>;
}
