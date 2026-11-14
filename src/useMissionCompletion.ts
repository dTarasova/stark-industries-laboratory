import {useEffect, useRef, useState} from 'react';

// Повторяем доставку после потери связи и конфликтов версии.
export function useMissionCompletion(complete:boolean, endpoint:string) {
  const run = useRef<number | undefined>(undefined);
  const [saved,setSaved]=useState(false);
  useEffect(() => {
    let stopped=false;
    async function sync() {
      try {
        const response=await fetch('/api/mission',{signal:AbortSignal.timeout(8000)});
        if (!response.ok) return;
        const mission=await response.json();
        if (stopped) return;
        if (run.current === undefined) run.current=endpoint === 'element-complete' ? Number(new URLSearchParams(location.search).get('run') ?? mission.missionRun) : mission.missionRun;
        if (!complete || mission.missionRun !== run.current) return;
        const field=endpoint === 'element-complete' ? 'elementDiscovered' : 'victory';
        if (mission[field]) {setSaved(true);return;}
        const result=await fetch('/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:mission.version,missionRun:run.current}),signal:AbortSignal.timeout(8000)});
        if (result.ok && !stopped) setSaved(true);
      } catch { /* Следующая попытка восстановит связь. */ }
    }
    void sync();
    const timer=window.setInterval(sync,3000);
    return () => {stopped=true;window.clearInterval(timer);};
  },[complete,endpoint]);
  return saved;
}

