"""Original deterministic synthesized foley and ambience; no third-party recordings."""
from pathlib import Path
import math,random,struct,wave
RATE=22050
root=Path(__file__).resolve().parents[1]/'game/assets/audio'
root.mkdir(parents=True,exist_ok=True)
for kind in ['paper','cloth','wood','ceramic','metal','rain','wind','birds','radio']:
    random_source=random.Random('little-days-'+kind)
    duration=4.0 if kind in ['rain','wind','birds','radio'] else .28
    samples=[];low=0.0
    for i in range(int(RATE*duration)):
        t=i/RATE;noise=random_source.uniform(-1,1);low=.96*low+.04*noise
        if kind=='paper':value=(noise*.15+math.sin(t*850)*.05)*math.exp(-t*22)
        elif kind=='cloth':value=low*.75*math.sin(math.pi*t/duration)**2
        elif kind=='wood':value=(math.sin(t*math.tau*185)*.24+noise*.13)*math.exp(-t*35)
        elif kind in ['ceramic','metal']:
            f=1100 if kind=='ceramic' else 700
            value=(math.sin(t*math.tau*f)*.16+math.sin(t*math.tau*f*2.17)*.07)*math.exp(-t*16)
        elif kind=='rain':value=noise*.08+low*.18
        elif kind=='wind':value=low*.6*(.7+.3*math.cos(t*math.tau/duration))
        elif kind=='birds':
            phase=t%2;value=math.sin(math.tau*(1800*phase+1100*phase*phase))*.08*max(0,math.sin(math.pi*phase/.23))**2 if phase<.23 else 0
        else:
            notes=[261.63,329.63,392,329.63,293.66,349.23,392,261.63]
            phase=t%.5;value=math.sin(math.tau*notes[int(t/.5)%8]*phase)*.12*math.exp(-phase*9)
        # Short edge fades avoid clicks at the loop boundary.
        value*=min(1,t/.025,(duration-t)/.025)
        samples.append(struct.pack('<h',round(max(-1,min(1,value))*32767)))
    with wave.open(str(root/(kind+'.wav')),'wb') as out:
        out.setnchannels(1);out.setsampwidth(2);out.setframerate(RATE);out.writeframes(b''.join(samples))
print('Generated nine original audio assets.')
