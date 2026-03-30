// Simple 2D Donut SMP prototype
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const chatInput = document.getElementById('chat-input');
const chatLog = document.getElementById('chat-log');
const autocomplete = document.getElementById('autocomplete');
const statusEl = document.getElementById('status');
const invItemsEl = document.getElementById('inv-items');
const offhandEl = document.getElementById('offhand');

const escModal = document.getElementById('esc-modal');
const serverIpInput = document.getElementById('server-ip');
const marketIpInput = document.getElementById('market-ip');
document.getElementById('save-ip').onclick = saveIps;
document.getElementById('close-esc').onclick = closeEsc;

let serverIP = localStorage.getItem('serverIP') || 'play.donut.example';
let marketIP = localStorage.getItem('marketIP') || 'market.example';
serverIpInput.value = serverIP;
marketIpInput.value = marketIP;

function saveIps(){
  serverIP = serverIpInput.value;
  marketIP = marketIpInput.value;
  localStorage.setItem('serverIP', serverIP);
  localStorage.setItem('marketIP', marketIP);
  appendChat(`Server IP set to ${serverIP}, marketplace ${marketIP}`);
}
function closeEsc(){ escModal.classList.add('hidden'); canvas.focus(); }

const commands = ['/help','/warp','/home','/auction','/order','/msg','/setip','/bots'];
function showAutocomplete(prefix){
  autocomplete.innerHTML = '';
  const list = commands.filter(c => c.startsWith(prefix));
  if(!list.length){ autocomplete.classList.add('hidden'); return; }
  list.forEach(c=>{
    const d = document.createElement('div');
    d.textContent = c;
    d.onclick = ()=> { chatInput.value = c + ' '; chatInput.focus(); autocomplete.classList.add('hidden'); };
    autocomplete.appendChild(d);
  });
  autocomplete.classList.remove('hidden');
}

chatInput.addEventListener('input', (e)=> {
  const v = chatInput.value;
  if(v.startsWith('/')) showAutocomplete(v);
  else autocomplete.classList.add('hidden');
});
chatInput.addEventListener('keydown', (e)=>{
  if(e.key === 'Tab'){ e.preventDefault(); // try to autocomplete first result
    const v = chatInput.value;
    const list = commands.filter(c => c.startsWith(v));
    if(list.length

