"""Verify the logical claims for SURKOV INDUSTRIES; uses only stdlib."""
import json
import itertools
from collections import defaultdict
from pathlib import Path

DATA=json.loads(Path(__file__).with_name('puzzle_data.json').read_text(encoding='utf-8'))
B={n['id']:n for n in DATA['buildings']}
W={frozenset((a,b)):w for a,b,w in DATA['edges']}


def has(a,b): return frozenset((a,b)) in W

def cycle(seq): return all(has(seq[i],seq[(i+1)%len(seq)]) for i in range(len(seq)))

def enclosed(seq, point):
    x,z=point
    p=[(B[v]['x'],B[v]['z']) for v in seq]
    inside=False
    j=len(p)-1
    for i in range(len(p)):
        xi,zi=p[i]; xj,zj=p[j]
        if (zi>z)!=(zj>z) and x < (xj-xi)*(z-zi)/(zj-zi)+xi:
            inside=not inside
        j=i
    return inside


def is_topology(nodes):
    ns=set(nodes)
    if len(ns)!=8 or not {'B','H'}<=ns: return False
    left=[v for v in ns if B[v]['x']<0]
    right=[v for v in ns if B[v]['x']>0]
    if len(left)!=4 or len(right)!=4:return False
    def is_ring(side, landmark):
        return any(cycle(order) and enclosed(order, landmark) for order in itertools.permutations(side))
    if not is_ring(left,(-5.65,0)) or not is_ring(right,(5.6,0)): return False
    es=[(a,b) for a,b in itertools.combinations(ns,2) if has(a,b)]
    bridges=[(a,b) for a,b in es if (B[a]['x']<0)!=(B[b]['x']<0)]
    if len(es)!=10 or len(bridges)!=2 or len(set(itertools.chain.from_iterable(bridges)))!=4: return False
    return True


def route_weight(path): return sum(W[frozenset((a,b))] for a,b in zip(path,path[1:]))


def checks(x,y):
    main=DATA['mainRoute']
    backup=['B',x,y,'H']
    assert all(has(a,b) for path in (main,backup) for a,b in zip(path,path[1:])), (x,y)
    assert set(main[1:-1]).isdisjoint(set(backup[1:-1]))
    assert route_weight(main)==7
    d1=route_weight(backup)>7
    d2=all(W[frozenset((a,b))]<6 for path in (main,backup) for a,b in zip(path,path[1:]))
    d3=sum(B[v].get('omega',False) for v in backup)<=1
    return route_weight(backup),d1,d2,d3

if __name__=='__main__':
    # fast reduce: enumerate pairs of connected local 4-cycles that enclose the courtyard
    leftids=[v for v in B if B[v]['x']<0]
    rightids=[v for v in B if B[v]['x']>0]
    candidates=[]
    for l in itertools.combinations(leftids,4):
        if not any(cycle(p) and enclosed(p,(-5.65,0)) for p in itertools.permutations(l)): continue
        for r in itertools.combinations(rightids,4):
            if is_topology(l+r): candidates.append(tuple(sorted(l+r)))
    print('Topology candidates:',len(candidates))
    for c in candidates: print('  ',''.join(c))
    print('\nPair  delay Doc1 Doc2 Doc3 all')
    for x in 'DEF':
        for y in 'JKL':
            c=tuple(sorted('ABC'+x+'GHI'+y))
            assert c in candidates, c
            delay,*v=checks(x,y)
            print(f'{x}-{y:1}     {delay:2}    '+ ' '.join('✓' if b else '×' for b in v)+'   '+('✓' if all(v) else '×'))
    assert len(candidates)==9, f'Expected exactly 9, got {len(candidates)}'
    assert sum(all(checks(x,y)[1:]) for x in 'DEF' for y in 'JKL')==1
    assert checks('F','L')[1:] == (True,True,True)
    for absent in range(3):
        count=sum(all(k for j,k in enumerate(checks(x,y)[1:]) if j!=absent) for x in 'DEF' for y in 'JKL')
        print('Without document', absent+1, 'remaining',count)
        assert count>=2
    print('\nAll tests passed.')
