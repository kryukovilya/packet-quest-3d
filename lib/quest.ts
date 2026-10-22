import {connections} from './journey.ts';
export type Room='corridor'|'info'|'server'|'gate'|'archive'|'dispatch';
export type Item='parcel'|'pass'|'stamp'|'cable'|'bug'|'bridge'|'signed';
export type Fragment='i'|'t'|'dot'|'mos'|'kva';
export const fragmentText:Record<Fragment,string>={i:'И',t:'Т',dot:'.',mos:'Мос',kva:'ква'};
export const itemNames:Record<Item,string>={parcel:'Пакет данных',pass:'Пропуск',stamp:'Штамп',cable:'Кабель',bug:'Баг',bridge:'Файл «МОСТ»',signed:'Пропуск с точкой'};
export type Flags={guardVisited:boolean;reboot:boolean;wired:boolean;cooled:boolean;stamped:boolean;gate:boolean;restored:boolean;frog:boolean;rebus:boolean};
export type Quest={version:1;started:boolean;room:Room;items:Item[];fragments:Fragment[];flags:Flags;links:number[];address:Fragment[];delivered:boolean;hints:number;steps:number};
export function freshQuest():Quest{return {version:1,started:false,room:'corridor',items:['parcel','pass'],fragments:[],flags:{guardVisited:false,reboot:false,wired:false,cooled:false,stamped:false,gate:false,restored:false,frog:false,rebus:false},links:[-1,-1,-1],address:[],delivered:false,hints:0,steps:0};}
export type Command={type:'start'|'travel'|'reboot'|'take'|'use'|'wire'|'cool'|'restore'|'rebus'|'append'|'remove'|'clear'|'send'|'hint';room?:Room;item?:Item;target?:string;socket?:number;plug?:number;letters?:string;fragment?:Fragment;index?:number};
export type Result={state:Quest;message:string;speaker:string;gain?:string;ok:boolean};
const rooms:Room[]=['corridor','info','server','gate','archive','dispatch'];
export function command(s:Quest,c:Command):Result{
 const n:Quest=structuredClone(s);const done=(message:string,speaker='Курьер',ok=true,gain?:string):Result=>({state:n,message,speaker,ok,gain});
 const fail=(message:string,speaker='Курьер'):Result=>({state:s,message,speaker,ok:false});
 const add=(f:Fragment)=>{if(!n.fragments.includes(f))n.fragments.push(f)};
 const take=(i:Item)=>{if(!n.items.includes(i))n.items.push(i)};
 const drop=(i:Item)=>{n.items=n.items.filter(v=>v!==i)};
 if(c.type==='start'){n.started=true;n.room='corridor';return done('Адрес на пакете стёрся. В справочной должны знать, что делать. Войдите в дверь «Справочная» или осмотрите коридор.');}
 if(!s.started||s.delivered)return fail('Приключение сейчас не активно.');
 n.steps++;
 if(c.type==='hint'){n.hints++;return done('Подсказка добавлена в блокнот.');}
 if(c.type==='travel'){
  if(!c.room||!rooms.includes(c.room))return fail('Такой локации нет.');
  if(c.room==='archive'&&!s.flags.gate)return fail('Архив за брандмауэром. Сначала нужен пропуск с правильным оформлением.','Охранник');
  if(c.room!==s.room&&!connections[s.room].includes(c.room))return fail('Сначала дойдите до двери соседнего отдела.');
  n.room=c.room;if(c.room==='gate')n.flags.guardVisited=true;const messages={corridor:'Коридор связывает отделы города. Нажмите на дверь, чтобы войти.',info:'Бот снова что-то оформляет. На стене — кнопка перезапуска, под стойкой — ящик.',server:'Сервер горячий, вентилятор молчит. Инженер делает вид, что так и задумано.',gate:'Брандмауэр проверяет документы. В очереди только вы.',archive:'Архивариус ушёл на обед. За него остались корзина, картотека и лягушка.',dispatch:'Почтовый терминал ждёт адрес. Найденные фрагменты можно переставлять.'};return done(messages[c.room]);
 }
 if(c.type==='reboot'){
  if(s.room!=='info')return fail('Кнопка перезапуска находится в справочной.');
  if(s.flags.reboot)return done('Я уже перезагружен. Ещё раз — и начну устанавливать обновления.','Бот справочной');
  n.flags.reboot=true;add('i');return done('Спасибо. Я запрашивал разрешение запросить разрешение. Возьмите букву И — из слова «информация». За оформлением пропуска обратитесь к охране. У них всё очень серьёзно. Даже точки.','Бот справочной',true,'Фрагмент И');
 }
 if(c.type==='take'){
  if(c.item==='stamp'&&s.room==='info'){
   if(!s.flags.reboot)return fail('Ящик закрыт: бот ещё не закончил бесконечное оформление.');
   if(!s.flags.guardVisited)return fail('Сначала узнайте у охраны, как оформить пропуск.');
   if(s.items.includes('stamp'))return done('Штамп уже в сумке.');take('stamp');return done('Штамп ставит одну точку. Минимализм в документообороте.','Курьер',true,'Штамп');
  }
  if(c.item==='cable'&&s.room==='server'){
   if(s.items.includes('cable')||s.flags.wired)return done('Кабель уже найден.');take('cable');return done('Один конец — в вентилятор. Второй — туда, где есть электричество. Вроде звучит убедительно.','Курьер',true,'Кабель');
  }
  return fail('Сейчас этот предмет взять нельзя.');
 }
 if(c.type==='use'){
  if(!c.item||!s.items.includes(c.item))return fail('Этого предмета нет в сумке.');
  if(c.item==='stamp'&&c.target==='pass'&&s.items.includes('pass')){drop('pass');take('signed');n.flags.stamped=true;add('dot');return done('«Пропустить курьера.» Теперь распоряжение закончено. Оттиск точки можно использовать и в адресе.','Курьер',true,'Фрагмент .');}
  if(c.item==='cable'&&c.target==='fan'&&s.room==='server'){drop('cable');n.flags.wired=true;return done('Кабель подключён. Осталось соединить три пары контактов с одинаковыми обозначениями. Нажмите на вентилятор.','Инженер');}
  if(c.item==='signed'&&c.target==='guard'&&s.room==='gate'){n.flags.gate=true;return done('Теперь точка стоит. До этого могло продолжаться: «Пропустить курьера… мимо». В архив проходите.','Охранник',true,'Архив открыт');}
  if(c.item==='pass'&&c.target==='guard'&&s.room==='gate')return fail('«Пропустить курьера» — это ещё не законченное предложение. Нет точки. Нет прохода.','Охранник');
  if(c.item==='bridge'&&c.target==='cabinet'&&s.room==='archive'){drop('bridge');n.flags.restored=true;return done('Файл восстановлен. На карточке написано: «МОСТ − Т». Отметьте букву, которую нужно убрать.','Картотека',true,'Первая часть ребуса');}
  if(c.item==='bug'&&c.target==='frog'&&s.room==='archive'){drop('bug');n.flags.frog=true;add('kva');return done('КВА! Спасибо за отладку обеда. Вообще-то я специалист по КВАлификации данных.','Лягушка',true,'Фрагмент ква');}
  if(c.item==='parcel'&&c.target==='terminal'&&s.room==='dispatch')return done('Пакет на месте. Соберите адрес из найденных фрагментов и нажмите «Отправить».','Терминал');
  return fail('Это здесь не поможет. Предмет остался в сумке — можно попробовать что-нибудь другое.');
 }
 if(c.type==='wire'){
  if(s.room!=='server'||!s.flags.wired||s.flags.cooled)return fail('Сначала подключите кабель к вентилятору.');
  if(!Number.isInteger(c.socket)||!Number.isInteger(c.plug)||c.socket!<0||c.socket!>2||c.plug!<0||c.plug!>2)return fail('Выберите контакт и разъём.');
  n.links=n.links.map((p,i)=>i===c.socket?c.plug!:p===c.plug?-1:p);return done('Контакт подключён. Обозначения на двух концах должны совпасть.','Панель питания');
 }
 if(c.type==='cool'){
  if(s.room!=='server'||!s.flags.wired)return fail('Вентилятору нужен кабель.');
  if(s.flags.cooled)return done('Охлаждение уже работает.','Инженер');
  if(s.links.some((v,i)=>v!==i))return fail('Защита отключила питание. Совместите одинаковые обозначения. Ничего не сгорело. Почти.','Инженер');
  n.flags.cooled=true;add('t');take('bug');return done('Температура в норме! Индикатор отдал букву Т, а из корпуса выполз баг. Заберите его: лягушка в архиве занимается отладкой.','Инженер',true,'Фрагмент Т и баг');
 }
 if(c.type==='restore'){
  if(s.room!=='archive'||!s.flags.gate)return fail('Сначала нужно попасть в архив.');
  if(s.flags.restored||s.items.includes('bridge'))return done('Файл «МОСТ» уже найден.');
  take('bridge');return done('В корзине нашёлся файл «МОСТ». Его удалили вместо ярлыка. Верните файл в картотеку.','Курьер',true,'Файл «МОСТ»');
 }
 if(c.type==='rebus'){
  if(s.room!=='archive'||!s.flags.restored)return fail('Сначала восстановите файл в картотеке.');
  if(s.flags.rebus)return done('Часть «Мос» уже записана.');
  if(c.letters!=='МОС')return fail('Запись «МОСТ − Т» означает: уберите Т из слова МОСТ. Остальные буквы сохраняют порядок.','Картотека');
  n.flags.rebus=true;add('mos');return done('МОСТ без Т — МОС. Эту часть адреса восстановили.','Курьер',true,'Фрагмент Мос');
 }
 if(['append','remove','clear','send'].includes(c.type)&&s.room!=='dispatch')return fail('Адрес собирается в почтовом терминале.');
 if(c.type==='append'){
  if(!c.fragment||!s.fragments.includes(c.fragment)||s.address.includes(c.fragment))return fail('Этот фрагмент недоступен.');
  n.address.push(c.fragment);return done('Фрагмент добавлен. Нажмите на него в адресе, чтобы убрать.','Терминал');
 }
 if(c.type==='remove'){
  if(!Number.isInteger(c.index)||c.index!<0||c.index!>=s.address.length)return fail('Такого фрагмента нет.');
  n.address.splice(c.index!,1);return done('Фрагмент возвращён в набор.','Терминал');
 }
 if(c.type==='clear'){n.address=[];return done('Адрес очищен. Фрагменты остались в наборе.','Терминал');}
 if(c.type==='send'){
  if(s.fragments.length<5)return fail('В адресе не хватает данных. Найдите все пять фрагментов.','Терминал');
  if(s.address.map(f=>fragmentText[f]).join('')!=='ИТ.Москва')return fail('Адрес не найден. Сначала две буквы, затем точка и город из ребуса.','Терминал');
  n.delivered=true;return done('Пакет доставлен. На этот раз туда, куда надо.','Терминал',true,'ИТ.Москва');
 }
 return fail('Неизвестное действие.');
}
export function nextHint(s:Quest,level=0):string{
 let hints:string[];
 if(s.room==='server'&&!s.flags.cooled){hints=!s.flags.wired?(s.items.includes('cable')?['Кабель уже найден. Пора вернуть его к работе.','Выберите кабель в сумке и нажмите на вентилятор.']:['Инженер знает, почему здесь жарко.','Поговорите с инженером, затем подберите кабель на полу.']):['Посмотрите на обозначения контактов.','На панели вентилятора соедините одинаковые знаки и включите питание.'];}
 else if(!s.flags.reboot)hints=['Бот зациклился. Осмотрите стену рядом.','В справочной поговорите с ботом. Подойдите к кнопке «РЕСТАРТ» справа и перезапустите бота.'];
 else if(!s.flags.guardVisited)hints=['Для архива нужен оформленный пропуск.','Через коридор зайдите в брандмауэр и поговорите с Капитаном Точкой.'];
 else if(!s.flags.stamped)hints=s.items.includes('stamp')?['У пропуска осталось незаконченное предложение.','Выберите штамп в сумке, затем нажмите на пропуск.']:['После перезапуска бот открыл кое-что полезное.','Осмотрите ящик справочной и заберите штамп.'];
 else if(!s.flags.cooled)hints=['В серверной ждут помощи с охлаждением.','Зайдите в серверную и поговорите с инженером.'];
 else if(!s.flags.gate)hints=['Охранник ждёт законченный документ.','Выберите пропуск с точкой в сумке и нажмите на охранника в брандмауэре.'];
 else if(!s.flags.restored)hints=s.items.includes('bridge')?['Файл найден. Верните его на рабочее место.','Выберите файл «МОСТ» и нажмите на картотеку архива.']:['Корзина не всегда означает, что всё потеряно.','Осмотрите корзину в архиве и восстановите файл «МОСТ».'];
 else if(!s.flags.rebus)hints=['На карточке действие с буквами.','В ребусе МОСТ − Т уберите только Т, затем проверьте результат.'];
 else if(!s.flags.frog)hints=['После ремонта сервера в сумке появился кое-кто съедобный.','Выберите бага в сумке и нажмите на механическую лягушку.'];
 else hints=['Все фрагменты найдены. Почтовый терминал ждёт.','На почте нажмите на терминал. Начало адреса — И и Т, затем точка и части города.'];
 return hints[level>0?1:0];
}
export function restoreQuest(raw:unknown):Quest|null{
 if(!raw||typeof raw!=='object')return null;
 const s=structuredClone(raw) as Quest;
 if(s.flags&&typeof s.flags==='object'&&s.flags.guardVisited===undefined)s.flags.guardVisited=!!(s.flags.stamped||s.flags.gate||s.room==='gate'||Array.isArray(s.items)&&s.items.includes('stamp'));
 if(s.version!==1||typeof s.started!=='boolean'||!rooms.includes(s.room)||typeof s.delivered!=='boolean')return null;
 if(!Array.isArray(s.items)||!s.items.every(i=>Object.hasOwn(itemNames,i))||new Set(s.items).size!==s.items.length)return null;
 if(!Array.isArray(s.fragments)||!s.fragments.every(f=>Object.hasOwn(fragmentText,f))||new Set(s.fragments).size!==s.fragments.length)return null;
 if(!s.flags||Object.keys(freshQuest().flags).some(k=>typeof s.flags[k as keyof Flags]!=='boolean'))return null;
 if(!Array.isArray(s.links)||s.links.length!==3||!s.links.every(n=>Number.isInteger(n)&&n>=-1&&n<=2))return null;
 if(!Array.isArray(s.address)||!s.address.every(f=>s.fragments.includes(f))||new Set(s.address).size!==s.address.length)return null;
 if(!Number.isInteger(s.hints)||s.hints<0||!Number.isInteger(s.steps)||s.steps<0)return null;
 // Reject inconsistent saves before they can strand a quest.
 if(s.flags.cooled&&(!s.flags.wired||s.links.some((v,i)=>v!==i)))return null;
 if((s.flags.stamped||s.items.includes('stamp'))&&!s.flags.guardVisited)return null;
 if(s.flags.gate&&!s.flags.stamped||s.room==='archive'&&!s.flags.gate)return null;
 if(s.flags.rebus&&!s.flags.restored||s.flags.restored&&!s.flags.gate)return null;
 const expected:Fragment[]=[];
 if(s.flags.reboot)expected.push('i');if(s.flags.cooled)expected.push('t');if(s.flags.stamped)expected.push('dot');if(s.flags.rebus)expected.push('mos');if(s.flags.frog)expected.push('kva');
 if(expected.length!==s.fragments.length||expected.some(f=>!s.fragments.includes(f)))return null;
 if(!s.items.includes('parcel')||s.flags.stamped!==s.items.includes('signed')||s.flags.stamped===s.items.includes('pass'))return null;
 if(s.flags.wired&&s.items.includes('cable')||s.flags.restored&&s.items.includes('bridge'))return null;
 if(s.flags.frog&&!s.flags.cooled||s.flags.frog&&s.items.includes('bug')||s.flags.cooled&&!s.flags.frog&&!s.items.includes('bug'))return null;
 if(s.delivered&&s.address.map(f=>fragmentText[f]).join('')!=='ИТ.Москва')return null;
 return structuredClone(s);
}
