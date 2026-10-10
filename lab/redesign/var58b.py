import sys
R = sys.argv[1]


def patch(p, pairs):
    s = open(R + p, encoding='utf-8').read()
    for o, n in pairs:
        assert o in s, p + ': ' + o[:90]
        s = s.replace(o, n, 1)
    open(R + p, 'w', encoding='utf-8', newline='\n').write(s)


# 시험대: POSBEST = 칸을 아는 손 (마을은 이어지는 곳에, 공격은 율법파 마을을 가장 많이 끊는 곳에)
patch('tools/tests/lib.mjs', [
    ("  const enemyPlan = E.planEnemy(state);\n",
     """  const enemyPlan = E.planEnemy(state);
  if (globalThis.process?.env?.POSBEST) {
    const legal = E.legalActions(state, 'player');
    const used = new Set(accepted.map((a) => a.tile));
    const own = E.linkedTiles ? E.linkedTiles(state, 'player') : new Set();
    const touch = (id) => E.neighbors(state, state.tileAt[id]).filter((n) => own.has(n.id)).length;
    const cutValue = (id) => {
      if (!E.linkedTiles) return 0;
      const before = E.villageCount(state, 'enemy');
      const t = state.tileAt[id]; const o = t.owner; t.owner = null;
      const after = E.villageCount(state, 'enemy'); t.owner = o;
      return before - after;
    };
    for (let i = 0; i < accepted.length; i++) {
      const a = accepted[i];
      if (a.build === 'village') {
        const alts = legal.filter((b) => b.build === 'village' && (b.tile === a.tile || !used.has(b.tile)));
        const best = alts.sort((x, y) => touch(y.tile) - touch(x.tile))[0];
        if (best && best.tile !== a.tile) { used.delete(a.tile); used.add(best.tile); accepted[i] = { ...best }; }
      } else if (a.type === 'attack') {
        const alts = legal.filter((b) => b.type === 'attack' && (b.tile === a.tile || !used.has(b.tile)));
        const best = alts.map((b) => ({ b, v: cutValue(b.tile) * 2 + E.actionOdds(state, b) })).sort((x, y) => y.v - x.v)[0]?.b;
        if (best && best.tile !== a.tile) { used.delete(a.tile); used.add(best.tile); accepted[i] = { ...best }; }
      }
    }
    for (let i = auto.length - 1; i >= 0; i--) if (accepted.some((a) => a.tile === auto[i].tile)) auto.splice(i, 1);
  }
"""),
])
print('ok')
