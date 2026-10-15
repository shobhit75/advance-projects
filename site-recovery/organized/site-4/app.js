const {useState,useRef,useEffect}=React;
const h=React.createElement;
const NODES=['nodeA','nodeB','nodeC'];
const NODE_COLORS=['#378ADD','#1D9E75','#BA7517'];
function chooseNode(n){return NODES[n.charCodeAt(0)%3];}
function ini(e){return(e[0]||'?').toUpperCase();}
function fext(n){return(n||'').includes('.')?n.split('.').pop().toLowerCase().slice(0,4):'bin';}
function fmtSz(b){if(!b)return'0B';if(b<1024)return b+'B';if(b<1048576)return(b/1024).toFixed(1)+'KB';return(b/1048576).toFixed(1)+'MB';}
function fmtSzTotal(b){if(b<1024)return b+'B';if(b<1048576)return(b/1024).toFixed(0)+'KB';if(b<1073741824)return(b/1048576).toFixed(1)+'MB';return(b/1073741824).toFixed(2)+'GB';}
function ago(ts){if(!ts)return'';const s=Math.floor((Date.now()-new Date(ts).getTime())/1000);if(s<60)return'just now';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return Math.floor(s/86400)+'d ago';}

let _sb=null;
function getSB(){
  if(_sb)return _sb;
  const url=localStorage.getItem('sb_url');
  const key=localStorage.getItem('sb_key');
  if(!url||!key)return null;
  _sb=supabase.createClient(url,key);
  return _sb;
}

const SETUP_SQL=`-- Run this in Supabase → SQL Editor → New query

create extension if not exists "pgcrypto";

-- Profiles (mirrors auth.users for easy lookup)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null
);

-- Clusters
create table public.clusters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Cluster members (admin / editor / viewer)
create table public.cluster_members (
  cluster_id uuid references public.clusters(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text not null default 'viewer',
  primary key (cluster_id, user_id)
);

-- Files
create table public.files (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid references public.clusters(id) on delete cascade,
  file_name text not null,
  storage_node text not null,
  size bigint not null default 0,
  uploaded_by uuid references public.profiles(id),
  uploaded_at timestamptz default now()
);

-- Activity logs
create table public.logs (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid references public.clusters(id) on delete cascade,
  type text,
  msg text,
  color text,
  at timestamptz default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.clusters enable row level security;
alter table public.cluster_members enable row level security;
alter table public.files enable row level security;
alter table public.logs enable row level security;

-- Profiles: anyone can read; users insert their own
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);

-- Clusters: members can view; authenticated users can create
create policy "clusters_select" on public.clusters for select using (
  exists (select 1 from public.cluster_members where cluster_id = clusters.id and user_id = auth.uid())
);
create policy "clusters_insert" on public.clusters for insert with check (auth.uid() is not null);
create policy "clusters_update" on public.clusters for update using (
  exists (select 1 from public.cluster_members where cluster_id = clusters.id and user_id = auth.uid() and role = 'admin')
);
create policy "clusters_delete" on public.clusters for delete using (
  exists (select 1 from public.cluster_members where cluster_id = clusters.id and user_id = auth.uid() and role = 'admin')
);

-- Cluster members
create policy "members_select" on public.cluster_members for select using (
  exists (select 1 from public.cluster_members cm2 where cm2.cluster_id = cluster_members.cluster_id and cm2.user_id = auth.uid())
);
create policy "members_all" on public.cluster_members for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- Files
create policy "files_select" on public.files for select using (
  exists (select 1 from public.cluster_members where cluster_id = files.cluster_id and user_id = auth.uid())
);
create policy "files_all" on public.files for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- Logs
create policy "logs_select" on public.logs for select using (
  exists (select 1 from public.cluster_members where cluster_id = logs.cluster_id and user_id = auth.uid())
);
create policy "logs_insert" on public.logs for insert with check (auth.uid() is not null);

-- Auto-create profile when a user signs up
create or replace function public.handle_new_user()
returns trigger as \$\$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
\$\$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();`;

/* ── Setup Page ── */
function SetupPage({onConfigured}){
  const [step,setStep]=useState('welcome');
  const [url,setUrl]=useState('');
  const [key,setKey]=useState('');
  const [err,setErr]=useState('');
  const [copied,setCopied]=useState(false);
  const [testing,setTesting]=useState(false);

  function copySQL(){
    navigator.clipboard.writeText(SETUP_SQL).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2500);}).catch(()=>{});
  }

  async function connect(e){
    e.preventDefault();setErr('');
    if(!url.trim()||!key.trim()){setErr('Both fields are required');return;}
    setTesting(true);
    try{
      const client=supabase.createClient(url.trim(),key.trim());
      const {error}=await client.from('profiles').select('id').limit(1);
      if(error&&error.code!=='PGRST116'&&!error.message.includes('relation')){
        setErr('Connection failed: '+error.message);setTesting(false);return;
      }
      localStorage.setItem('sb_url',url.trim());
      localStorage.setItem('sb_key',key.trim());
      _sb=client;
      onConfigured();
    }catch(ex){setErr('Could not connect. Check your URL and key.');}
    setTesting(false);
  }

  const logo=h('div',{className:'sb-logo',style:{marginBottom:'1.5rem'}},'cluster',h('span',null,'.storage'));

  if(step==='welcome') return h('div',{className:'auth-wrap',style:{maxWidth:480}},
    logo,
    h('div',{className:'card',style:{marginBottom:0}},
      h('p',{style:{fontSize:15,fontWeight:500,marginBottom:6}},'Connect to Supabase'),
      h('p',{style:{fontSize:13,color:'var(--color-text-secondary)',lineHeight:1.7,marginBottom:16}},'Your data will live in a real database — permanent across all devices and browsers. Setup takes about 3 minutes.'),
      h('div',null,
        [
          ['1','Create a free project','Go to supabase.com → New Project. Free tier is plenty.'],
          ['2','Run the SQL schema','Copy the SQL provided and run it in the Supabase SQL Editor to create tables and security rules.'],
          ['3','Paste your credentials','Enter your Project URL and anon key to connect the app.'],
        ].map(([n,t,d])=>h('div',{key:n,className:'setup-step'},
          h('div',{className:'step-num'},n),
          h('div',null,h('div',{style:{fontSize:13,fontWeight:500,marginBottom:3}},t),h('div',{style:{fontSize:12,color:'var(--color-text-secondary)',lineHeight:1.6}},d))
        ))
      ),
      h('div',{className:'fl',style:{marginTop:16}},
        h('a',{href:'https://supabase.com/dashboard',target:'_blank',rel:'noreferrer',className:'btn',style:{flex:1,textAlign:'center',textDecoration:'none',display:'block',padding:'7px 14px'}},'Open Supabase ↗'),
        h('button',{className:'btn btn-p',onClick:()=>setStep('sql'),style:{flex:1}},'View SQL →')
      )
    )
  );

  if(step==='sql') return h('div',{className:'auth-wrap',style:{maxWidth:560}},
    logo,
    h('div',{className:'card',style:{marginBottom:0}},
      h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}},
        h('span',{style:{fontSize:14,fontWeight:500}},'SQL schema'),
        h('button',{className:'btn btn-sm',onClick:copySQL},copied?'✓ Copied':'Copy SQL')
      ),
      h('p',{style:{fontSize:12,color:'var(--color-text-secondary)',marginBottom:8,lineHeight:1.6}},'Paste this into your Supabase project → SQL Editor → New query → Run.'),
      h('div',{className:'sql-block'},SETUP_SQL),
      h('div',{className:'fl',style:{marginTop:12}},
        h('button',{className:'btn',onClick:()=>setStep('welcome'),style:{flex:1}},'← Back'),
        h('button',{className:'btn btn-p',onClick:()=>setStep('creds'),style:{flex:1}},'Done — enter credentials →')
      )
    )
  );

  return h('div',{className:'auth-wrap'},
    logo,
    h('div',{className:'card',style:{marginBottom:0}},
      h('p',{style:{fontSize:14,fontWeight:500,marginBottom:12}},'Enter your Supabase credentials'),
      h('form',{onSubmit:connect},
        h('div',{className:'fg'},
          h('label',{className:'lbl'},'Project URL'),
          h('input',{className:'inp',type:'url',placeholder:'https://xxxx.supabase.co',value:url,onChange:e=>setUrl(e.target.value)})
        ),
        h('div',{className:'fg'},
          h('label',{className:'lbl'},'Anon / public key'),
          h('input',{className:'inp',type:'text',placeholder:'eyJhbGci...',value:key,onChange:e=>setKey(e.target.value)})
        ),
        err&&h('p',{className:'err'},err),
        h('div',{className:'fl',style:{marginTop:4}},
          h('button',{type:'button',className:'btn',onClick:()=>setStep('sql'),style:{flex:1}},'← Back'),
          h('button',{type:'submit',className:'btn btn-p',disabled:testing,style:{flex:1}},
            testing?h('span',null,h('span',{className:'spinner'}),'Connecting...'):'Connect'
          )
        )
      )
    )
  );
}

/* ── Auth Page ── */
function AuthPage(){
  const [tab,setTab]=useState('login');
  const [form,setForm]=useState({email:'',password:''});
  const [err,setErr]=useState('');
  const [loading,setLoading]=useState(false);
  const [success,setSuccess]=useState('');

  async function submit(e){
    e.preventDefault();setErr('');setSuccess('');
    if(!form.email||!form.password){setErr('Fill in all fields');return;}
    setLoading(true);
    const sb=getSB();
    try{
      let res;
      if(tab==='login'){
        res=await sb.auth.signInWithPassword({email:form.email,password:form.password});
      }else{
        res=await sb.auth.signUp({email:form.email,password:form.password});
        if(!res.error&&res.data?.user&&!res.data.session){
          setSuccess('Check your email to confirm your account, then sign in.');
          setLoading(false);return;
        }
      }
      if(res.error)setErr(res.error.message);
    }catch(ex){setErr('Connection error. Check your credentials.');}
    setLoading(false);
  }

  return h('div',{className:'auth-wrap'},
    h('div',{className:'sb-logo',style:{marginBottom:'1.5rem'}},'cluster',h('span',null,'.storage')),
    h('div',{className:'card',style:{marginBottom:0}},
      h('div',{className:'tabs'},
        ['login','register'].map(t=>h('button',{key:t,className:'tab'+(tab===t?' act':''),onClick:()=>{setTab(t);setErr('');setSuccess('');}},t==='login'?'Sign in':'Register'))
      ),
      h('form',{onSubmit:submit},
        h('div',{className:'fg'},h('label',{className:'lbl'},'Email'),h('input',{className:'inp',type:'email',placeholder:'you@example.com',autoComplete:'email',value:form.email,onChange:e=>setForm(p=>({...p,email:e.target.value}))})),
        h('div',{className:'fg'},h('label',{className:'lbl'},'Password'),h('input',{className:'inp',type:'password',placeholder:'••••••••',autoComplete:tab==='login'?'current-password':'new-password',value:form.password,onChange:e=>setForm(p=>({...p,password:e.target.value}))})),
        err&&h('p',{className:'err'},err),
        success&&h('p',{className:'ok',style:{marginTop:6}},success),
        !success&&h('button',{className:'btn btn-p btn-full',type:'submit',disabled:loading,style:{marginTop:'0.5rem'}},loading?h('span',null,h('span',{className:'spinner'}),'...'):(tab==='login'?'Sign in':'Create account'))
      )
    ),
    h('p',{style:{fontSize:12,color:'var(--color-text-tertiary)',textAlign:'center',marginTop:12}},'Connected to your Supabase project')
  );
}

/* ── Main App ── */
function App(){
  const [configured,setConfigured]=useState(()=>!!(localStorage.getItem('sb_url')&&localStorage.getItem('sb_key')));
  const [session,setSession]=useState(null);
  const [authReady,setAuthReady]=useState(false);
  const [clusters,setClusters]=useState([]);
  const [files,setFiles]=useState([]);
  const [logs,setLogs]=useState([]);
  const [profiles,setProfiles]=useState({});
  const [loading,setLoading]=useState(false);
  const [view,setView]=useState('dash');
  const [selC,setSelC]=useState(null);
  const [clusterTab,setClusterTab]=useState('files');

  useEffect(()=>{
    if(!configured){setAuthReady(true);return;}
    const sb=getSB();
    if(!sb){setAuthReady(true);return;}
    sb.auth.getSession().then(({data:{session}})=>{setSession(session);setAuthReady(true);});
    const {data:{subscription}}=sb.auth.onAuthStateChange((_,s)=>setSession(s));
    return()=>subscription.unsubscribe();
  },[configured]);

  useEffect(()=>{
    if(session)loadData();
    else{setClusters([]);setFiles([]);setLogs([]);setProfiles({});}
  },[session]);

  async function loadData(){
    const sb=getSB();if(!sb||!session)return;
    setLoading(true);
    try{
      const {data:myMem}=await sb.from('cluster_members').select('cluster_id').eq('user_id',session.user.id);
      const cids=(myMem||[]).map(m=>m.cluster_id);
      const [cRes,fRes,lRes,pRes,cmRes]=await Promise.all([
        cids.length?sb.from('clusters').select('*').in('id',cids):Promise.resolve({data:[]}),
        cids.length?sb.from('files').select('*').in('cluster_id',cids).order('uploaded_at',{ascending:false}):Promise.resolve({data:[]}),
        cids.length?sb.from('logs').select('*').in('cluster_id',cids).order('at',{ascending:false}).limit(100):Promise.resolve({data:[]}),
        sb.from('profiles').select('id,email'),
        cids.length?sb.from('cluster_members').select('*').in('cluster_id',cids):Promise.resolve({data:[]}),
      ]);
      const mm={};(cmRes.data||[]).forEach(m=>{if(!mm[m.cluster_id])mm[m.cluster_id]=[];mm[m.cluster_id].push(m);});
      setClusters((cRes.data||[]).map(c=>({...c,members:mm[c.id]||[]})));
      setFiles(fRes.data||[]);
      setLogs(lRes.data||[]);
      const pm={};(pRes.data||[]).forEach(p=>{pm[p.id]=p.email;});
      setProfiles(pm);
    }catch(ex){console.error('loadData',ex);}
    setLoading(false);
  }

  async function addLog(clusterId,type,msg,color){
    const sb=getSB();if(!sb)return;
    const {data}=await sb.from('logs').insert({cluster_id:clusterId,type,msg,color}).select().single();
    if(data)setLogs(p=>[data,...p.slice(0,99)]);
  }

  function getUser(id){return{id,email:profiles[id]||id};}
  function myRole(c){const m=c.members.find(m=>m.user_id===session?.user?.id);return m?m.role:null;}
  function openCluster(c){setSelC(c.id);setView('cluster');setClusterTab('files');}
  function refreshSelC(){return clusters.find(c=>c.id===selC);}

  if(!configured)return h(SetupPage,{onConfigured:()=>setConfigured(true)});
  if(!authReady)return h('div',{style:{padding:'2rem',color:'var(--color-text-secondary)',fontSize:13}},h('span',{className:'spinner'}),'Connecting...');
  if(!session)return h(AuthPage,null);

  if(loading&&clusters.length===0)return h('div',{style:{padding:'2rem',color:'var(--color-text-secondary)',fontSize:13}},h('span',{className:'spinner'}),'Loading your data...');

  const myClusters=clusters;
  const allFiles=files;
  const totalSize=allFiles.reduce((a,f)=>a+(f.size||0),0);
  const cluster=view==='cluster'?refreshSelC():null;
  const role=cluster?myRole(cluster):null;

  const sidebar=h('div',{className:'sb'},
    h('div',{className:'sb-logo'},'cluster',h('span',null,'.storage')),
    h('div',{className:'nav-sec'},'workspace'),
    h('button',{className:'ni'+(view==='dash'?' act':''),onClick:()=>setView('dash')},h('span',{className:'ni-icon'},'◈'),'Dashboard'),
    h('button',{className:'ni'+(view==='clusters'?' act':''),onClick:()=>setView('clusters')},h('span',{className:'ni-icon'},'▤'),'Clusters'),
    h('button',{className:'ni'+(view==='search'?' act':''),onClick:()=>setView('search')},h('span',{className:'ni-icon'},'◎'),'Search files'),
    h('button',{className:'ni'+(view==='activity'?' act':''),onClick:()=>setView('activity')},h('span',{className:'ni-icon'},'◷'),'Activity log'),
    myClusters.length>0&&h('div',{className:'nav-sec'},'clusters'),
    ...myClusters.map(c=>h('button',{key:c.id,className:'ni'+(selC===c.id&&view==='cluster'?' act':''),onClick:()=>openCluster(c)},h('span',{className:'ni-icon'},'·'),c.name)),
    h('div',{className:'sb-ft'},
      h('div',{className:'fl',style:{marginBottom:'8px'}},
        h('div',{className:'av'},ini(session.user.email)),
        h('span',{style:{fontSize:12,color:'var(--color-text-secondary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}},session.user.email)
      ),
      h('button',{className:'btn btn-sm',style:{width:'100%'},onClick:()=>getSB().auth.signOut()},'Sign out')
    )
  );

  let content;
  if(view==='dash')content=h(DashView,{clusters:myClusters,files:allFiles,totalSize,logs,session,getUser,openCluster});
  else if(view==='clusters')content=h(ClustersView,{clusters:myClusters,files,session,addLog,openCluster,loadData});
  else if(view==='search')content=h(SearchView,{clusters:myClusters,files:allFiles,setFiles,getUser,session});
  else if(view==='activity')content=h(ActivityView,{logs,clusters});
  else if(view==='cluster'&&cluster)content=h(ClusterView,{cluster,role,files,setFiles,clusters,session,getUser,profiles,addLog,clusterTab,setClusterTab,setView,loadData});

  return h('div',{className:'r'},h('div',{className:'lay'},sidebar,h('div',{className:'main'},content)));
}

/* ── Dashboard ── */
function DashView({clusters,files,totalSize,logs,session,getUser,openCluster}){
  const totalFiles=files.length;
  const nodeMap={nodeA:0,nodeB:0,nodeC:0};
  files.forEach(f=>{nodeMap[f.storage_node]=(nodeMap[f.storage_node]||0)+1;});
  const recentLogs=logs.slice(0,8);
  const canvasRef=useRef(null);
  useEffect(()=>{
    if(!canvasRef.current)return;
    const ctx=canvasRef.current.getContext('2d');
    const ns={nodeA:0,nodeB:0,nodeC:0};
    files.forEach(f=>{ns[f.storage_node]=(ns[f.storage_node]||0)+(f.size||0);});
    const ch=new Chart(ctx,{type:'bar',data:{labels:['nodeA','nodeB','nodeC'],datasets:[{data:[ns.nodeA/1024,ns.nodeB/1024,ns.nodeC/1024],backgroundColor:['#85B7EB','#5DCAA5','#EF9F27'],borderRadius:4,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{font:{family:"'IBM Plex Mono',monospace",size:11}}},y:{grid:{color:'rgba(0,0,0,0.04)'},ticks:{callback:v=>v+'KB',font:{size:11}}}}}});
    return()=>ch.destroy();
  },[files]);

  return h('div',null,
    h('div',{className:'ph'},h('p',{className:'pt'},'Dashboard'),h('p',{className:'ps'},'Overview across all your clusters')),
    h('div',{className:'grid4',style:{marginBottom:'1rem'}},
      h('div',{className:'metric'},h('div',{className:'metric-val'},clusters.length),h('div',{className:'metric-lbl'},'clusters')),
      h('div',{className:'metric'},h('div',{className:'metric-val'},totalFiles),h('div',{className:'metric-lbl'},'total files')),
      h('div',{className:'metric'},h('div',{className:'metric-val'},fmtSzTotal(totalSize)),h('div',{className:'metric-lbl'},'stored')),
      h('div',{className:'metric'},h('div',{className:'metric-val'},clusters.reduce((a,c)=>a+c.members.length,0)),h('div',{className:'metric-lbl'},'total members'))
    ),
    h('div',{className:'grid2'},
      h('div',null,
        h('div',{className:'card'},h('div',{className:'card-hd'},h('span',{className:'card-title'},'Storage by node')),h('div',{style:{position:'relative',height:'160px'}},h('canvas',{ref:canvasRef}))),
        h('div',{className:'card'},h('div',{className:'card-hd'},h('span',{className:'card-title'},'Your clusters')),
          clusters.length===0?h('div',{className:'empty'},'No clusters yet'):
          clusters.map(c=>h('div',{key:c.id,className:'file-row',style:{cursor:'pointer'},onClick:()=>openCluster(c)},
            h('div',{style:{flex:1}},h('div',{className:'file-name'},c.name),h('div',{style:{fontSize:11,color:'var(--color-text-tertiary)',marginTop:2}},c.members.length+' members · '+files.filter(f=>f.cluster_id===c.id).length+' files')),
            h('span',{style:{fontSize:12,color:'var(--color-text-secondary)'}},'→')
          ))
        )
      ),
      h('div',null,
        h('div',{className:'card'},h('div',{className:'card-hd'},h('span',{className:'card-title'},'Node distribution')),
          NODES.map((n,i)=>{const cnt=nodeMap[n]||0;const pct=Math.round(cnt/Math.max(totalFiles,1)*100);return h('div',{key:n,className:'node-bar-wrap'},h('div',{className:'node-bar-label'},h('span',{className:'mono'},n),h('span',null,cnt+' files · '+pct+'%')),h('div',{className:'node-bar-track'},h('div',{className:'node-bar-fill',style:{width:pct+'%',background:NODE_COLORS[i]}})));})
        ),
        h('div',{className:'card'},h('div',{className:'card-hd'},h('span',{className:'card-title'},'Recent activity')),
          recentLogs.length===0?h('div',{className:'empty'},'No activity yet'):
          recentLogs.map(l=>h('div',{key:l.id,className:'act-row'},h('div',{className:'act-dot',style:{background:l.color}}),h('div',{className:'act-msg'},l.msg),h('div',{className:'act-time'},ago(l.at))))
        )
      )
    )
  );
}

/* ── Clusters View ── */
function ClustersView({clusters,files,session,addLog,openCluster,loadData}){
  const [name,setName]=useState('');
  const [err,setErr]=useState('');
  const [creating,setCreating]=useState(false);

  async function create(e){
    e.preventDefault();
    if(!name.trim()){setErr('Enter a name');return;}
    setCreating(true);setErr('');
    const sb=getSB();
    try{
      const {data:c,error}=await sb.from('clusters').insert({name:name.trim()}).select().single();
      if(error){setErr(error.message);setCreating(false);return;}
      await sb.from('cluster_members').insert({cluster_id:c.id,user_id:session.user.id,role:'admin'});
      await addLog(c.id,'create',session.user.email+' created cluster '+c.name,'#1D9E75');
      await loadData();
      setName('');
    }catch(ex){setErr('Failed to create cluster');}
    setCreating(false);
  }

  return h('div',null,
    h('div',{className:'ph'},h('p',{className:'pt'},'Clusters'),h('p',{className:'ps'},'All storage clusters you belong to')),
    h('div',{className:'card'},
      h('div',{className:'card-hd'},h('span',{className:'card-title'},'Create cluster')),
      h('form',{onSubmit:create},
        h('div',{className:'fl'},
          h('input',{className:'inp',placeholder:'Cluster name…',value:name,onChange:e=>setName(e.target.value),style:{flex:1}}),
          h('button',{className:'btn',type:'submit',disabled:creating},creating?'…':'Create')
        ),
        err&&h('p',{className:'err'},err)
      )
    ),
    clusters.length===0?h('div',{className:'empty'},'No clusters yet'):
    h('div',{className:'c-grid'},
      clusters.map(c=>{
        const cf=files.filter(f=>f.cluster_id===c.id);
        const sz=cf.reduce((a,f)=>a+(f.size||0),0);
        const myRole=c.members.find(m=>m.user_id===session.user.id)?.role||'viewer';
        return h('div',{key:c.id,className:'c-card',onClick:()=>openCluster(c)},
          h('div',{className:'c-name'},c.name),
          h('div',{className:'c-meta'},h('span',null,c.members.length+' members'),h('span',null,cf.length+' files'),h('span',null,fmtSzTotal(sz))),
          h('div',{style:{marginTop:8}},h('span',{className:'bdg bdg-'+myRole},myRole))
        );
      })
    )
  );
}

/* ── Search View ── */
function SearchView({clusters,files,setFiles,getUser,session}){
  const [q,setQ]=useState('');
  const [nodeFilter,setNodeFilter]=useState('all');
  const [sortBy,setSortBy]=useState('name');

  const results=files.filter(f=>{
    const mq=!q||(f.file_name||'').toLowerCase().includes(q.toLowerCase());
    const mn=nodeFilter==='all'||f.storage_node===nodeFilter;
    return mq&&mn;
  }).sort((a,b)=>{
    if(sortBy==='name')return(a.file_name||'').localeCompare(b.file_name||'');
    if(sortBy==='size')return(b.size||0)-(a.size||0);
    if(sortBy==='date')return new Date(b.uploaded_at)-new Date(a.uploaded_at);
    if(sortBy==='node')return(a.storage_node||'').localeCompare(b.storage_node||'');
    return 0;
  });

  async function delFile(id){
    await getSB().from('files').delete().eq('id',id);
    setFiles(p=>p.filter(f=>f.id!==id));
  }

  function clusterName(cid){return clusters.find(c=>c.id===cid)?.name||cid;}

  return h('div',null,
    h('div',{className:'ph'},h('p',{className:'pt'},'Search files'),h('p',{className:'ps'},'Find files across all your clusters')),
    h('div',{className:'card'},
      h('div',{className:'fl',style:{marginBottom:'0.75rem'}},
        h('input',{className:'inp',placeholder:'Search by filename…',value:q,onChange:e=>setQ(e.target.value),style:{flex:1}}),
        h('select',{className:'sel',value:nodeFilter,onChange:e=>setNodeFilter(e.target.value)},
          h('option',{value:'all'},'All nodes'),
          NODES.map(n=>h('option',{key:n,value:n},n))
        )
      ),
      h('div',{className:'sort-row'},
        h('span',{style:{fontSize:11,color:'var(--color-text-tertiary)',marginRight:4}},'Sort:'),
        ['name','size','date','node'].map(s=>h('button',{key:s,className:'sort-btn'+(sortBy===s?' act':''),onClick:()=>setSortBy(s)},s))
      ),
      h('div',{style:{fontSize:12,color:'var(--color-text-tertiary)',marginBottom:'0.75rem'}},results.length+' result'+(results.length===1?'':'s')),
      results.length===0?h('div',{className:'empty'},'No files match your search'):
      results.map(f=>h('div',{key:f.id,className:'file-row'},
        h('span',{className:'file-ext'},fext(f.file_name)),
        h('div',{style:{flex:1,overflow:'hidden'}},h('div',{className:'file-name'},f.file_name),h('div',{style:{fontSize:11,color:'var(--color-text-tertiary)',marginTop:2}},clusterName(f.cluster_id))),
        h('span',{className:'file-node mono'},f.storage_node),
        h('span',{className:'file-meta'},fmtSz(f.size)),
        h('span',{className:'file-meta'},ago(f.uploaded_at)),
        h('button',{className:'btn btn-sm btn-d',onClick:()=>delFile(f.id)},'✕')
      ))
    )
  );
}

/* ── Activity View ── */
function ActivityView({logs,clusters}){
  const [filter,setFilter]=useState('all');
  const clusterName=cid=>clusters.find(c=>c.id===cid)?.name||cid;
  const filtered=filter==='all'?logs:logs.filter(l=>l.cluster_id===filter);
  return h('div',null,
    h('div',{className:'ph'},h('p',{className:'pt'},'Activity log'),h('p',{className:'ps'},'All events across your clusters')),
    h('div',{className:'card'},
      h('div',{className:'fl',style:{marginBottom:'1rem'}},
        h('span',{style:{fontSize:12,color:'var(--color-text-secondary)'}},'Filter:'),
        h('select',{className:'sel',value:filter,onChange:e=>setFilter(e.target.value)},
          h('option',{value:'all'},'All clusters'),
          clusters.map(c=>h('option',{key:c.id,value:c.id},c.name))
        )
      ),
      filtered.length===0?h('div',{className:'empty'},'No activity'):
      filtered.map(l=>h('div',{key:l.id,className:'act-row'},
        h('div',{className:'act-dot',style:{background:l.color}}),
        h('div',{style:{flex:1}},h('div',{className:'act-msg'},l.msg),h('div',{style:{fontSize:11,color:'var(--color-text-tertiary)',marginTop:2}},clusterName(l.cluster_id))),
        h('div',{className:'act-time'},ago(l.at))
      ))
    )
  );
}

/* ── Cluster View ── */
function ClusterView({cluster,role,files,setFiles,clusters,session,getUser,profiles,addLog,clusterTab,setClusterTab,setView,loadData}){
  const cf=files.filter(f=>f.cluster_id===cluster.id);
  const tabs=['files','members','analytics','settings'];
  const isAdmin=role==='admin';
  const canUpload=['admin','editor'].includes(role);

  return h('div',null,
    h('button',{className:'back-btn',onClick:()=>setView('clusters')},'← Back to clusters'),
    h('div',{className:'ph'},
      h('div',{className:'fl',style:{justifyContent:'space-between',flexWrap:'wrap'}},
        h('div',null,h('p',{className:'pt'},cluster.name),h('p',{className:'ps'},'Your role: ',h('span',{className:'bdg bdg-'+role},role))),
        h('div',{className:'fl'},
          h('div',{className:'metric',style:{minWidth:70,padding:'6px 12px'}},h('div',{className:'metric-val',style:{fontSize:18}},cf.length),h('div',{className:'metric-lbl'},'files')),
          h('div',{className:'metric',style:{minWidth:70,padding:'6px 12px'}},h('div',{className:'metric-val',style:{fontSize:18}},fmtSzTotal(cf.reduce((a,f)=>a+(f.size||0),0))),h('div',{className:'metric-lbl'},'stored'))
        )
      )
    ),
    h('div',{className:'tabs',style:{marginBottom:'1rem'}},
      tabs.map(t=>h('button',{key:t,className:'tab'+(clusterTab===t?' act':''),onClick:()=>setClusterTab(t)},t))
    ),
    clusterTab==='files'&&h(FilesTab,{cluster,cf,files,setFiles,session,getUser,canUpload,addLog}),
    clusterTab==='members'&&h(MembersTab,{cluster,session,getUser,profiles,isAdmin,addLog,loadData}),
    clusterTab==='analytics'&&h(AnalyticsTab,{cf}),
    clusterTab==='settings'&&h(SettingsTab,{cluster,isAdmin,session,setView,addLog,loadData})
  );
}

/* ── Files Tab ── */
function FilesTab({cluster,cf,files,setFiles,session,getUser,canUpload,addLog}){
  const [sortBy,setSortBy]=useState('date');
  const [nodeFilter,setNodeFilter]=useState('all');
  const [q,setQ]=useState('');
  const [uploadMsg,setUploadMsg]=useState('');
  const [dragging,setDragging]=useState(false);
  const [uploading,setUploading]=useState(false);
  const fileRef=useRef(null);

  async function handleFiles(fileList){
    if(!canUpload){setUploadMsg('error:Permission denied');return;}
    setUploading(true);
    const sb=getSB();let added=0;
    for(const file of Array.from(fileList)){
      const node=chooseNode(file.name);
      const {data}=await sb.from('files').insert({cluster_id:cluster.id,file_name:file.name,storage_node:node,size:file.size,uploaded_by:session.user.id}).select().single();
      if(data){setFiles(p=>[data,...p]);await addLog(cluster.id,'upload',session.user.email+' uploaded '+file.name+' → '+node,'#378ADD');added++;}
    }
    setUploadMsg('ok:'+added+' file'+(added===1?'':'s')+' stored');
    setTimeout(()=>setUploadMsg(''),4000);
    setUploading(false);
  }

  async function delFile(id,name){
    await getSB().from('files').delete().eq('id',id);
    setFiles(p=>p.filter(f=>f.id!==id));
    await addLog(cluster.id,'delete',session.user.email+' deleted '+name,'#E24B4A');
  }

  const shown=cf.filter(f=>(!q||(f.file_name||'').toLowerCase().includes(q.toLowerCase()))&&(nodeFilter==='all'||f.storage_node===nodeFilter))
    .sort((a,b)=>{
      if(sortBy==='name')return(a.file_name||'').localeCompare(b.file_name||'');
      if(sortBy==='size')return(b.size||0)-(a.size||0);
      if(sortBy==='node')return(a.storage_node||'').localeCompare(b.storage_node||'');
      return new Date(b.uploaded_at)-new Date(a.uploaded_at);
    });

  return h('div',null,
    canUpload&&h('div',{className:'card'},
      h('div',{className:'card-hd'},h('span',{className:'card-title'},'Upload')),
      h('div',{className:'drop-zone'+(dragging?' drag':''),onClick:()=>fileRef.current&&fileRef.current.click(),onDragOver:e=>{e.preventDefault();setDragging(true);},onDragLeave:()=>setDragging(false),onDrop:e=>{e.preventDefault();setDragging(false);handleFiles(e.dataTransfer.files);}},
        h('input',{type:'file',multiple:true,ref:fileRef,style:{display:'none'},onChange:e=>handleFiles(e.target.files)}),
        h('div',{className:'drop-icon'},uploading?'⏳':'↑'),
        h('div',null,uploading?'Saving to Supabase…':'Drag & drop files or click to choose'),
        h('div',{style:{fontSize:11,color:'var(--color-text-tertiary)',marginTop:4}},'Auto-routed to nodes · stored in your database')
      ),
      uploadMsg&&h('p',{className:uploadMsg.startsWith('ok:')?'ok':'err'},uploadMsg.slice(3))
    ),
    h('div',{className:'card'},
      h('div',{className:'card-hd'},h('span',{className:'card-title'},'Files ('+cf.length+')')),
      h('div',{className:'fl',style:{marginBottom:'0.75rem'}},
        h('input',{className:'inp',placeholder:'Filter by name…',value:q,onChange:e=>setQ(e.target.value),style:{flex:1}}),
        h('select',{className:'sel',value:nodeFilter,onChange:e=>setNodeFilter(e.target.value)},h('option',{value:'all'},'All nodes'),...NODES.map(n=>h('option',{key:n,value:n},n)))
      ),
      h('div',{className:'sort-row'},h('span',{style:{fontSize:11,color:'var(--color-text-tertiary)'}},'Sort:'),...['date','name','size','node'].map(s=>h('button',{key:s,className:'sort-btn'+(sortBy===s?' act':''),onClick:()=>setSortBy(s)},s))),
      shown.length===0?h('div',{className:'empty'},'No files'):
      shown.map(f=>{
        const uploader=getUser(f.uploaded_by);
        return h('div',{key:f.id,className:'file-row'},
          h('span',{className:'file-ext'},fext(f.file_name)),
          h('div',{style:{flex:1,overflow:'hidden'}},h('div',{className:'file-name'},f.file_name),h('div',{style:{fontSize:11,color:'var(--color-text-tertiary)',marginTop:2}},'by '+(uploader?.email||'unknown')+' · '+ago(f.uploaded_at))),
          h('span',{className:'file-node mono'},f.storage_node),
          h('span',{className:'file-meta'},fmtSz(f.size)),
          canUpload&&h('button',{className:'btn btn-sm btn-d',onClick:()=>delFile(f.id,f.file_name)},'✕')
        );
      })
    )
  );
}

/* ── Members Tab ── */
function MembersTab({cluster,session,getUser,profiles,isAdmin,addLog,loadData}){
  const [email,setEmail]=useState('');
  const [newRole,setNewRole]=useState('editor');
  const [msg,setMsg]=useState('');
  const [saving,setSaving]=useState(false);

  async function addMember(e){
    e.preventDefault();setMsg('');setSaving(true);
    const sb=getSB();
    const {data:target}=await sb.from('profiles').select('id,email').eq('email',email.trim()).single();
    if(!target){setMsg('error:User not found. They must sign up first.');setSaving(false);return;}
    if(cluster.members.find(m=>m.user_id===target.id)){setMsg('error:Already a member');setSaving(false);return;}
    const {error}=await sb.from('cluster_members').insert({cluster_id:cluster.id,user_id:target.id,role:newRole});
    if(error){setMsg('error:'+error.message);setSaving(false);return;}
    await addLog(cluster.id,'member',session.user.email+' added '+target.email+' as '+newRole,'#1D9E75');
    await loadData();
    setEmail('');setMsg('ok:Member added');setTimeout(()=>setMsg(''),3000);
    setSaving(false);
  }

  async function changeRole(userId,role){
    await getSB().from('cluster_members').update({role}).eq('cluster_id',cluster.id).eq('user_id',userId);
    const u=getUser(userId);
    await addLog(cluster.id,'member',session.user.email+' changed '+u?.email+' to '+role,'#BA7517');
    await loadData();
  }

  async function removeMember(userId){
    const u=getUser(userId);
    await getSB().from('cluster_members').delete().eq('cluster_id',cluster.id).eq('user_id',userId);
    await addLog(cluster.id,'member',session.user.email+' removed '+u?.email,'#E24B4A');
    await loadData();
  }

  return h('div',null,
    h('div',{className:'card'},
      h('div',{className:'card-hd'},h('span',{className:'card-title'},'Members ('+cluster.members.length+')')),
      cluster.members.map(m=>{
        const u=getUser(m.user_id);
        const isMe=m.user_id===session.user.id;
        return h('div',{key:m.user_id,className:'mem-row'},
          h('div',{className:'av'},ini(u?.email||'?')),
          h('div',{className:'mem-email'},u?.email||m.user_id,isMe&&h('span',{style:{fontSize:11,color:'var(--color-text-tertiary)',marginLeft:4}},'(you)')),
          isAdmin&&!isMe?h('select',{className:'sel',value:m.role,onChange:e=>changeRole(m.user_id,e.target.value),style:{fontSize:12,padding:'3px 8px'}},['admin','editor','viewer'].map(r=>h('option',{key:r,value:r},r))):h('span',{className:'bdg bdg-'+m.role},m.role),
          isAdmin&&!isMe&&h('button',{className:'btn btn-sm btn-d',onClick:()=>removeMember(m.user_id)},'Remove')
        );
      })
    ),
    isAdmin&&h('div',{className:'card'},
      h('div',{className:'card-hd'},h('span',{className:'card-title'},'Add member')),
      h('form',{onSubmit:addMember},
        h('div',{className:'fl',style:{marginBottom:'0.6rem'}},
          h('input',{className:'inp',type:'email',placeholder:'member@example.com',value:email,onChange:e=>setEmail(e.target.value),style:{flex:1}}),
          h('select',{className:'sel',value:newRole,onChange:e=>setNewRole(e.target.value)},['admin','editor','viewer'].map(r=>h('option',{key:r,value:r},r))),
          h('button',{className:'btn',type:'submit',disabled:saving},saving?'…':'Add')
        ),
        msg&&h('p',{className:msg.startsWith('ok:')?'ok':'err'},msg.slice(3)),
        h('p',{className:'hint'},'User must already have an account')
      )
    )
  );
}

/* ── Analytics Tab ── */
function AnalyticsTab({cf}){
  const canvasRef=useRef(null);
  const pieRef=useRef(null);
  const nodeMap={nodeA:0,nodeB:0,nodeC:0};
  const nodeSize={nodeA:0,nodeB:0,nodeC:0};
  cf.forEach(f=>{nodeMap[f.storage_node]++;nodeSize[f.storage_node]+=(f.size||0);});
  const extMap={};
  cf.forEach(f=>{const e=fext(f.file_name);extMap[e]=(extMap[e]||0)+1;});
  const topExt=Object.entries(extMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const totalSz=cf.reduce((a,f)=>a+(f.size||0),0);

  useEffect(()=>{
    if(!canvasRef.current)return;
    const ctx=canvasRef.current.getContext('2d');
    const ch=new Chart(ctx,{type:'bar',data:{labels:['nodeA','nodeB','nodeC'],datasets:[{label:'Files',data:[nodeMap.nodeA,nodeMap.nodeB,nodeMap.nodeC],backgroundColor:['#85B7EB','#5DCAA5','#EF9F27'],borderRadius:4,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{font:{family:"'IBM Plex Mono',monospace",size:11}}},y:{grid:{color:'rgba(0,0,0,0.05)'},ticks:{stepSize:1}}}}});
    return()=>ch.destroy();
  },[cf]);

  useEffect(()=>{
    if(!pieRef.current||cf.length===0)return;
    const ctx=pieRef.current.getContext('2d');
    const ch=new Chart(ctx,{type:'doughnut',data:{labels:['nodeA','nodeB','nodeC'],datasets:[{data:[nodeSize.nodeA,nodeSize.nodeB,nodeSize.nodeC],backgroundColor:['#85B7EB','#5DCAA5','#EF9F27'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},cutout:'65%'}});
    return()=>ch.destroy();
  },[cf]);

  return h('div',null,
    h('div',{className:'grid4',style:{marginBottom:'1rem'}},
      h('div',{className:'metric'},h('div',{className:'metric-val'},cf.length),h('div',{className:'metric-lbl'},'total files')),
      h('div',{className:'metric'},h('div',{className:'metric-val'},fmtSzTotal(totalSz)),h('div',{className:'metric-lbl'},'total size')),
      h('div',{className:'metric'},h('div',{className:'metric-val'},Object.keys(extMap).length),h('div',{className:'metric-lbl'},'file types')),
      h('div',{className:'metric'},h('div',{className:'metric-val'},NODES.filter(n=>nodeMap[n]>0).length+'/3'),h('div',{className:'metric-lbl'},'nodes used'))
    ),
    h('div',{className:'grid2'},
      h('div',{className:'card'},h('div',{className:'card-hd'},h('span',{className:'card-title'},'Files per node')),h('div',{style:{position:'relative',height:'180px'}},h('canvas',{ref:canvasRef}))),
      h('div',{className:'card'},h('div',{className:'card-hd'},h('span',{className:'card-title'},'Storage by node')),
        cf.length===0?h('div',{className:'empty'},'No files'):
        h('div',null,
          h('div',{style:{position:'relative',height:'130px'}},h('canvas',{ref:pieRef})),
          h('div',{className:'fl',style:{justifyContent:'center',gap:12,marginTop:8}},
            NODES.map((n,i)=>h('span',{key:n,style:{display:'flex',alignItems:'center',gap:4,fontSize:12,color:'var(--color-text-secondary)'}},h('span',{style:{width:10,height:10,borderRadius:2,background:NODE_COLORS[i],display:'inline-block'}}),n+' '+fmtSzTotal(nodeSize[n])))
          )
        )
      )
    ),
    h('div',{className:'card'},
      h('div',{className:'card-hd'},h('span',{className:'card-title'},'File types')),
      topExt.length===0?h('div',{className:'empty'},'No files'):
      topExt.map(([e,cnt])=>h('div',{key:e,className:'node-bar-wrap'},
        h('div',{className:'node-bar-label'},h('span',{className:'mono'},'.'+e),h('span',null,cnt+' file'+(cnt===1?'':'s'))),
        h('div',{className:'node-bar-track'},h('div',{className:'node-bar-fill',style:{width:Math.round(cnt/cf.length*100)+'%',background:'#888780'}}))
      ))
    )
  );
}

/* ── Settings Tab ── */
function SettingsTab({cluster,isAdmin,session,setView,addLog,loadData}){
  const [newName,setNewName]=useState(cluster.name);
  const [nameMsg,setNameMsg]=useState('');
  const [confirm,setConfirm]=useState('');
  const [delErr,setDelErr]=useState('');
  const [saving,setSaving]=useState(false);

  async function saveName(e){
    e.preventDefault();
    if(!newName.trim()){setNameMsg('error:Name cannot be empty');return;}
    setSaving(true);
    const {error}=await getSB().from('clusters').update({name:newName.trim()}).eq('id',cluster.id);
    if(error){setNameMsg('error:'+error.message);}else{
      await addLog(cluster.id,'settings',session.user.email+' renamed cluster to '+newName.trim(),'#BA7517');
      await loadData();
      setNameMsg('ok:Name updated');setTimeout(()=>setNameMsg(''),3000);
    }
    setSaving(false);
  }

  async function deleteCluster(){
    if(confirm!==cluster.name){setDelErr('Type the exact cluster name to confirm');return;}
    await getSB().from('clusters').delete().eq('id',cluster.id);
    await loadData();
    setView('clusters');
  }

  return h('div',null,
    isAdmin&&h('div',{className:'card'},
      h('div',{className:'card-hd'},h('span',{className:'card-title'},'Cluster name')),
      h('form',{onSubmit:saveName},
        h('div',{className:'fl'},h('input',{className:'inp',value:newName,onChange:e=>setNewName(e.target.value),style:{flex:1}}),h('button',{className:'btn',type:'submit',disabled:saving},saving?'…':'Save')),
        nameMsg&&h('p',{className:nameMsg.startsWith('ok:')?'ok':'err'},nameMsg.slice(3))
      )
    ),
    h('div',{className:'card'},
      h('div',{className:'card-hd'},h('span',{className:'card-title'},'Info')),
      h('table',{style:{width:'100%',fontSize:13}},
        h('tbody',null,
          [['Cluster ID',cluster.id],['Your role',cluster.members.find(m=>m.user_id===session.user.id)?.role||'—'],['Members',cluster.members.length]].map(([k,v])=>
            h('tr',{key:k},h('td',{style:{color:'var(--color-text-secondary)',padding:'5px 0',width:'40%'}},k),h('td',{className:'mono',style:{fontSize:12}},String(v)))
          )
        )
      )
    ),
    isAdmin&&h('div',{className:'card'},
      h('div',{className:'card-hd'},h('span',{className:'card-title',style:{color:'#A32D2D'}},'Danger zone')),
      h('div',{className:'settings-danger'},
        h('p',{style:{fontSize:13,color:'#712B13',marginBottom:'0.75rem'}},'Deleting this cluster is permanent. All files and members will be removed from the database.'),
        h('div',{className:'fg'},h('label',{className:'lbl'},'Type cluster name to confirm'),h('input',{className:'inp',placeholder:cluster.name,value:confirm,onChange:e=>setConfirm(e.target.value)})),
        delErr&&h('p',{className:'err',style:{marginBottom:6}},delErr),
        h('button',{className:'btn btn-d',onClick:deleteCluster},'Delete cluster')
      )
    )
  );
}

ReactDOM.render(h(App),document.getElementById('R'));
