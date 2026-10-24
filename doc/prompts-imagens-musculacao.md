# Prompts das imagens — programa de Musculação

São 33 imagens, uma por exercício de `server/programs/musculacao.ts`. Cada uma
substitui o arquivo de mesmo nome em `client/public/demos/`. **Mantenha o nome
do arquivo:** assim nenhuma linha de código muda, basta sobrescrever, fazer o
commit e o deploy.

## Como gerar

O caminho automático é `scripts/generate-demos-gemini.py`: ele lê este
arquivo, usa o `gemini-3-pro-image` e grava em `.demos-gemini/` para revisão.
Para gerar à mão, em qualquer IA de imagem:

1. Gere primeiro o **Front squat** e ajuste até o personagem ficar como você
   quer.
2. Use essa imagem como **referência de personagem** em todas as outras, e o
   adesivo `client/public/demos/exercise-dip_*.png` como referência de estilo.
   Sem referência, cada imagem sai com um atleta diferente.
3. Para cada exercício, envie o **bloco de estilo** + o **prompt do
   exercício**, nessa ordem.
4. Formato: paisagem 4:3, no mínimo 1200×900, PNG com o nome indicado.

## Como os prompts são escritos

Modelos de imagem erram pose de exercício de jeitos previsíveis: puxam para a
variação mais comum (front squat vira back squat, 90/90 vira afundo), escondem
a articulação que importa atrás do corpo e inventam equipamento. Por isso cada
prompt tem quatro partes, sempre na mesma ordem:

- **Camera** — o ângulo escolhido para que as articulações que definem o
  exercício fiquem visíveis, não o ângulo "bonito".
- **Setup** — equipamento e onde o corpo está apoiado.
- **Body** — a posição de cada segmento, em ângulos e relações concretas
  ("canelas verticais", "joelho a 90°"), no instante descrito.
- **Must be correct / Avoid** — o que torna o exercício reconhecível e os
  erros que o modelo tende a cometer, nomeados explicitamente.

Os prompts estão em inglês porque os modelos seguem instruções de pose com mais
precisão em inglês; o nome do exercício é o mesmo que aparece no app.

## Bloco de estilo (vai em todos os prompts)

```text
STYLE — identical in every image of the series:
Flat vector sticker illustration with clean bold dark outlines and soft cel
shading. One athlete: a fit man in his late 20s with short dark-brown hair,
orange-red tank top, black athletic shorts, white crew socks and orange-red
training shoes. The athlete and all equipment together are wrapped in one thick
white sticker outline. The scene sits directly on a full-bleed dark teal
background (#1F373B) with a subtle vertical gradient and a soft oval shadow
under the scene. No frame, no card, no rounded panel, no border around the
image itself. No floor texture, no gym background, no extra people, no extra
equipment beyond what is described. Landscape 4:3 composition, the whole body
and all equipment fully visible and centered with generous margin. Anatomically
correct proportions and correct, safe exercise technique. No text, no letters,
no numbers, no logos, no watermark, no arrows, no motion lines unless asked.
```

## Exercícios

| # | Exercício (no app) | Arquivo |
|---|---|---|
| 1 | Front rack stretch | `musculacao-front-rack-stretch.jpg` |
| 2 | Knee-to-wall ankle mobility | `musculacao-knee-to-wall-ankle-mobility.jpg` |
| 3 | Clean pull | `musculacao-clean-pull.jpg` |
| 4 | Front squat | `musculacao-front-squat.jpg` |
| 5 | Leg press | `musculacao-leg-press.jpg` |
| 6 | Lying leg curl | `musculacao-lying-leg-curl.jpg` |
| 7 | Spanish squat isometric | `musculacao-spanish-squat-isometric.jpg` |
| 8 | Pallof press | `musculacao-pallof-press.jpg` |
| 9 | Wrist extension mobility | `musculacao-wrist-extension-mobility.jpg` |
| 10 | Scapular pull-up | `musculacao-scapular-pull-up.jpg` |
| 11 | Arch hold | `musculacao-arch-hold.jpg` |
| 12 | Chest-to-bar pull-up | `musculacao-chest-to-bar-pull-up.jpg` |
| 13 | Strict pull-up | `musculacao-strict-pull-up.jpg` |
| 14 | Lat pulldown | `musculacao-lat-pulldown.jpg` |
| 15 | Strict bar dip | `musculacao-strict-bar-dip.jpg` |
| 16 | Seated cable row | `musculacao-seated-cable-row.jpg` |
| 17 | Hollow body hold | `musculacao-hollow-body-hold.jpg` |
| 18 | Dead hang | `musculacao-dead-hang.jpg` |
| 19 | Wall slide | `musculacao-wall-slide.jpg` |
| 20 | Overhead squat PVC | `musculacao-overhead-squat-pvc.jpg` |
| 21 | Strict press | `musculacao-strict-press.jpg` |
| 22 | Pike push-up | `musculacao-pike-push-up.jpg` |
| 23 | Cable face pull | `musculacao-cable-face-pull.jpg` |
| 24 | Standing calf raise | `musculacao-standing-calf-raise.jpg` |
| 25 | Seated calf raise | `musculacao-seated-calf-raise.jpg` |
| 26 | Double-under technique drill | `musculacao-double-under-technique-drill.jpg` |
| 27 | Wall-facing handstand hold | `musculacao-wall-facing-handstand-hold.jpg` |
| 28 | 90/90 hip switches | `musculacao-90-90-hip-switches.jpg` |
| 29 | Cossack squat | `musculacao-cossack-squat.jpg` |
| 30 | Cable external rotation | `musculacao-cable-external-rotation.jpg` |
| 31 | Bulgarian split squat | `musculacao-bulgarian-split-squat.jpg` |
| 32 | Romanian deadlift | `musculacao-romanian-deadlift.jpg` |
| 33 | Hanging knee raise | `musculacao-hanging-knee-raise.jpg` |

### 1. Front rack stretch — `musculacao-front-rack-stretch.jpg`
```text
EXERCISE: Front rack stretch (mobility for the clean).
Camera: three-quarter front view from the athlete's front-left, eye level, so
both raised elbows and the bar on the shoulders are visible.
Setup: a squat rack; an Olympic barbell (no plates) sits in the rack hooks at
the height of his collarbones.
Body: he stands tall, close to the rack, feet hip-width. The bar rests across
the FRONT of his shoulders, touching the collarbones. Only the fingertips of
both hands are hooked under the bar at shoulder width, palms up. Both elbows
are driven forward and up so the upper arms point straight ahead, parallel to
the floor. Torso vertical, chin slightly tucked.
Must be correct: bar on the front of the shoulders; elbows high and forward;
fingertips (not full fist) under the bar.
Avoid: bar on the upper back, hands gripping around the bar, elbows pointing
down, weight plates on the bar.
```

### 2. Knee-to-wall ankle mobility — `musculacao-knee-to-wall-ankle-mobility.jpg`
```text
EXERCISE: Knee-to-wall ankle mobility (ankle dorsiflexion drill).
Camera: pure side profile, the wall on the right edge of the frame, so the
front shin angle and the flat front heel are clearly visible.
Setup: a plain vertical wall, nothing else.
Body: half-kneeling facing the wall. The front foot is flat on the floor,
toes about one hand-length from the wall. The front knee travels forward past
the toes until the kneecap touches the wall, so the front shin leans forward
about 30-40 degrees. The front heel stays completely flat on the floor. The
back knee rests on the floor behind him, back foot on its toes. Both palms
rest lightly on the wall at chest height, torso upright.
Must be correct: front heel flat; front knee touching the wall in front of
the toes; back knee on the floor.
Avoid: standing lunge, both knees off the floor, front heel lifted.
```

### 3. Clean pull — `musculacao-clean-pull.jpg`
```text
EXERCISE: Clean pull, top of the pull (triple extension).
Camera: pure side profile from the athlete's left, so the extended hips, knees
and ankles form one visible line.
Setup: an Olympic barbell loaded with one large black bumper plate on each
side.
Body: the bar is held with a shoulder-width overhand grip and completely
straight arms, touching the top of the thighs. Hips and knees are fully
extended, he rises onto the balls of both feet with heels off the floor, the
shoulders are shrugged up toward the ears and sit slightly behind the bar,
chest up, gaze forward.
Must be correct: arms straight (no elbow bend); body tall and fully extended
on the toes; bar close to the thighs.
Avoid: bent arms, bar pulled to the chest, a squat or hinge position, flat
feet.
```

### 4. Front squat — `musculacao-front-squat.jpg`
```text
EXERCISE: Barbell FRONT squat, bottom position. This is not a back squat.
Camera: three-quarter front view from the athlete's front-left, eye level, so
the bar sitting on the front of the shoulders and the high elbows are obvious.
Setup: an Olympic barbell loaded with one large black bumper plate on each
side.
Body: the bar rests on the FRONT of the shoulders, across the front deltoids
and collarbones, just below the chin. Front rack grip: fingertips under the
bar with palms facing up, both elbows pointing straight forward and lifted so
the upper arms are parallel to the floor. He sits deep: hips below the knees,
torso almost vertical, knees pushed forward and out over the toes, both heels
flat on the floor. Face fully visible behind the bar.
Must be correct: bar in front of the neck, never behind it; elbows high and
forward; very upright torso.
Avoid: bar on the upper back or trapezius, hands wrapped around the bar with
elbows down, forward-leaning torso, crossed-arm grip.
```

### 5. Leg press — `musculacao-leg-press.jpg`
```text
EXERCISE: 45-degree sled leg press.
Camera: pure side profile, so the reclined seat, the 45-degree rails and the
bent knees are clear.
Setup: a 45-degree plate-loaded leg press machine: reclined padded seat at the
bottom left, two parallel rails rising up and to the right at 45 degrees, a
sled with a large foot platform on the rails, black weight plates on the sled
horns.
Body: he lies back in the seat with back and hips flat on the pad, hands on
the side handles. Both feet are flat on the platform at shoulder width. Knees
bent about 90 degrees, mid-repetition, knees in line with the feet.
Must be correct: seated and reclined; legs push up the 45-degree sled; the
whole machine visible.
Avoid: horizontal or vertical leg press, standing squat machine, feet off the
platform.
```

### 6. Lying leg curl — `musculacao-lying-leg-curl.jpg`
```text
EXERCISE: Lying (prone) leg curl machine.
Camera: pure side profile, the athlete's head on the right.
Setup: a prone leg curl machine: a long padded bench with a slight bend at the
hips, handles at the front, a roller pad at the foot end connected to a weight
stack.
Body: he lies FACE DOWN on the bench, hips pressed into the pad, hands holding
the front handles, head resting forward. The roller pad sits on the back of
his lower legs just above the heels. Both knees are bent about 90 degrees, so
the lower legs point straight up and the heels curl toward the glutes. Thighs
stay flat on the bench.
Must be correct: face down; knees bent so the shins point up; roller on the
back of the ankles.
Avoid: lying on the back, seated leg curl, legs straight.
```

### 7. Spanish squat isometric — `musculacao-spanish-squat-isometric.jpg`
```text
EXERCISE: Spanish squat isometric hold.
Camera: pure side profile with the rack post on the right, so the band, the
vertical shins and the hips sitting back are clear.
Setup: one vertical rack post; a thick resistance band is looped around the
post at knee height and around the back of both of his knees.
Body: he faces the post and sits back into a squat, leaning against the band
tension. Shins stay VERTICAL, thighs about parallel to the floor, torso
upright, both feet flat. Arms extended straight forward at shoulder height for
balance.
Must be correct: band behind the knees pulling toward the post; vertical
shins; hips sitting back.
Avoid: band around the waist or ankles, knees far over the toes, holding the
post with the hands.
```

### 8. Pallof press — `musculacao-pallof-press.jpg`
```text
EXERCISE: Pallof press (anti-rotation core exercise).
Camera: front view of the athlete, with the cable machine at the left edge of
the frame, so the sideways cable pull is visible.
Setup: a cable machine on his left, the pulley at chest height, a single
D-handle on the cable.
Body: he stands SIDEWAYS to the machine in an athletic stance, feet shoulder
width, knees slightly bent. Both hands hold the handle together and press it
straight forward, arms fully extended in front of the sternum. The cable runs
horizontally from the machine to his hands. Torso square to the camera, not
rotated.
Must be correct: standing sideways to the machine; arms pressed straight
forward; cable pulling from the side.
Avoid: facing the machine, rowing, twisting the torso, holding the handle at
the hip.
```

### 9. Wrist extension mobility — `musculacao-wrist-extension-mobility.jpg`
```text
EXERCISE: Kneeling wrist extension stretch.
Camera: pure side profile, close enough to see the hands and fingers.
Setup: an exercise mat.
Body: he is on hands and knees, knees under the hips. Palms flat on the floor
under the shoulders with the FINGERS POINTING BACK toward the knees. Elbows
straight, and he rocks his shoulders slightly back behind the hands to stretch
the forearms. Back flat, head neutral.
Must be correct: fingers pointing back toward the body; palms flat; elbows
straight.
Avoid: fingers pointing forward, push-up position, fists on the floor.
```

### 10. Scapular pull-up — `musculacao-scapular-pull-up.jpg`
```text
EXERCISE: Scapular pull-up (straight-arm shoulder blade pull).
Camera: pure side profile, so the straight elbows and the depressed shoulders
are visible.
Setup: a pull-up bar on a simple gym rig, high enough that his feet hang well
above the floor.
Body: he hangs with an overhand shoulder-width grip and COMPLETELY STRAIGHT
ARMS. The shoulder blades are pulled down and back, so the shoulders sit away
from the ears and the chest lifts slightly toward the bar. Legs straight and
together, toes pointed down.
Must be correct: elbows locked straight; shoulders pulled down; body only a
few centimeters higher than a dead hang.
Avoid: bent elbows, chin near the bar, swinging or kipping.
```

### 11. Arch hold — `musculacao-arch-hold.jpg`
```text
EXERCISE: Arch hold (superman hold).
Camera: pure side profile at floor level, so the curve of the whole body is
clear.
Setup: an exercise mat.
Body: he lies FACE DOWN. Arms are straight and extended overhead in line with
the ears. Chest, arms and both STRAIGHT legs are lifted off the mat at the same
time, so the body forms a gentle upward banana curve; only the belly and the
front of the hips touch the mat. Gaze toward the mat, neck neutral.
Must be correct: face down; arms overhead; straight legs lifted; banana curve.
Avoid: lying on the back, bent knees, arms by the sides, a push-up.
```

### 12. Chest-to-bar pull-up — `musculacao-chest-to-bar-pull-up.jpg`
```text
EXERCISE: Chest-to-bar pull-up, top position.
Camera: pure side profile, so the contact between the chest and the bar is
visible.
Setup: a tall pull-up bar on a simple gym rig, high enough that even at the
top of the pull-up his feet are far above the floor.
Body: overhand grip a little wider than the shoulders. He has pulled up until
his upper chest, just below the collarbones, TOUCHES the bar. Elbows are
pulled down and back behind the torso, chest proud, head behind the bar plane,
legs straight together and slightly in front of the body.
Must be correct: the bar touches his CHEST below the collarbones, so the chin
and the whole head are clearly above and behind the bar; legs straight.
Avoid: feet touching or standing on the floor, chin only at bar height, bent
knees, arms straight, a muscle-up with the body above the bar.
```

### 13. Strict pull-up — `musculacao-strict-pull-up.jpg`
```text
EXERCISE: Strict pull-up, top position.
Camera: pure side profile.
Setup: a pull-up bar on a simple gym rig.
Body: overhand shoulder-width grip, the CHIN clearly above the bar, elbows bent
and pointing down. The body forms a straight, slightly hollow line with legs
straight and together, toes pointed down, no swing.
Must be correct: chin above the bar; straight legs under the body.
Avoid: chest touching the bar, bent knees kicking, kipping arch.
```

### 14. Lat pulldown — `musculacao-lat-pulldown.jpg`
```text
EXERCISE: Lat pulldown machine.
Camera: pure side profile, so the cable from the overhead pulley and the bar at
the upper chest are visible.
Setup: a lat pulldown machine: seat, knee pads holding the thighs, a tall
column with an overhead pulley, a weight stack, a cable down to a long wide
straight bar.
Body: he sits with the thighs locked under the knee pads, torso upright with a
slight lean back. Wide overhand grip on the bar, which he has pulled down to
the upper chest. Elbows point down and slightly back, chest lifted.
Must be correct: seated; bar in FRONT of the head at the upper chest; cable
vertical from above.
Avoid: pulling the bar behind the neck, standing, a rowing machine.
```

### 15. Strict bar dip — `musculacao-strict-bar-dip.jpg`
```text
EXERCISE: Strict dip on parallel bars, bottom position.
Camera: pure side profile, so the 90-degree elbows are visible.
Setup: two parallel dip bars at hip height of a standing person.
Body: he supports himself with one hand on each bar. At the bottom of the dip:
elbows bent about 90 degrees and pointing back, shoulders level with the
elbows, torso leaning slightly forward. Knees bent with the ankles crossed
behind him, feet clear of the floor.
Must be correct: hands on two parallel bars; elbows at 90 degrees pointing
back; feet off the floor.
Avoid: bench dips with feet on the floor, ring dips, elbows flared sideways.
```

### 16. Seated cable row — `musculacao-seated-cable-row.jpg`
```text
EXERCISE: Seated cable row.
Camera: pure side profile with the machine on the right.
Setup: a low-row cable station: a long low bench, an angled foot platform, a
low pulley and a weight stack in front of him, a V-grip handle on the cable.
Body: he sits upright on the bench with both feet on the foot platform and the
knees slightly bent. He pulls the V-handle to the lower ribs: elbows driven
back past the torso, close to the body, shoulder blades squeezed together,
chest up, torso vertical. The cable runs horizontally from the pulley to his
hands.
Must be correct: seated upright; handle at the lower ribs; elbows behind the
torso.
Avoid: leaning far back, rounding the back, a standing row.
```

### 17. Hollow body hold — `musculacao-hollow-body-hold.jpg`
```text
EXERCISE: Hollow body hold.
Camera: pure side profile at floor level.
Setup: an exercise mat.
Body: he lies ON HIS BACK with the lower back pressed into the mat. His
shoulder blades and STRAIGHT legs are lifted only a hand-width off the mat.
Both arms are straight and stretched BEYOND HIS HEAD, pointing away from his
feet and almost parallel to the floor, biceps beside the ears. Toes pointed.
The whole body is long and nearly horizontal, like a shallow rocking boat. Seen from the side the body is a shallow
dish/banana curve that opens upward, with only the lower back touching the
mat.
Must be correct: face up; LOW position — heels and hands only about 15 cm
above the mat, the body almost flat; arms overhead behind the head, NOT
reaching toward the feet; only the lower back on the mat.
Avoid: a V-up or V-sit with the torso high, hands reaching to the toes,
lying face down, a sit-up or crunch, bent knees, feet on the floor.
```

### 18. Dead hang — `musculacao-dead-hang.jpg`
```text
EXERCISE: Dead hang (passive hang for grip and shoulders).
Camera: pure side profile.
Setup: a pull-up bar on a simple gym rig, high enough that his feet hang well
above the floor.
Body: he hangs completely relaxed with an overhand shoulder-width grip, arms
fully straight, shoulders relaxed up toward the ears, body long and still,
legs straight together, toes pointing down.
Must be correct: straight arms; relaxed long body; feet off the floor.
Avoid: bent elbows, pulling up, knees bent.
```

### 19. Wall slide — `musculacao-wall-slide.jpg`
```text
EXERCISE: Wall slide (scapular upward rotation drill).
Camera: front view of the athlete, the wall directly behind him.
Setup: a plain flat wall.
Body: he stands with the back of the head, upper back and glutes touching the
wall, feet a small step in front of it. Arms in a "W": upper arms out to the
sides at shoulder height, elbows bent 90 degrees, forearms vertical, the backs
of the forearms and hands touching the wall. Ribs down, lower back flat on the
wall.
Must be correct: his back against the wall; both HANDS UP AT HEAD HEIGHT,
higher than the elbows, palms facing forward, like a goalpost / cactus shape.
Avoid: arms hanging down by the sides, hands below the shoulders, facing the
wall, arms forward, a push-up against the wall.
```

### 20. Overhead squat PVC — `musculacao-overhead-squat-pvc.jpg`
```text
EXERCISE: Overhead squat with a PVC pipe, bottom position.
Camera: three-quarter front view from the front-left, so the wide grip and the
deep squat are both visible.
Setup: a long, light-grey PVC pipe (no plates).
Body: the pipe is held overhead with a very wide snatch grip, elbows locked,
the pipe directly above the middle of the feet. Deep squat: hips below the
knees, torso upright, knees out over the toes, both heels flat on the floor,
shoulders actively pushing up.
Must be correct: wide grip; arms locked overhead; deep squat.
Avoid: narrow grip, pipe in front of the head, a loaded barbell, heels lifted.
```

### 21. Strict press — `musculacao-strict-press.jpg`
```text
EXERCISE: Barbell strict press, lockout.
Camera: pure side profile, so the bar stacked over the shoulders is visible.
Setup: an Olympic barbell with one black bumper plate on each side.
Body: he stands tall, feet hip-width. The bar is pressed straight overhead with
the elbows locked, the bar directly above the shoulders and the middle of the
feet; the head pushes slightly forward through the arms. Glutes and core
braced, knees straight.
Must be correct: arms locked overhead; bar over the mid-foot; legs straight.
Avoid: bent knees (push press), leaning back, bar in front of the face.
```

### 22. Pike push-up — `musculacao-pike-push-up.jpg`
```text
EXERCISE: Elevated pike push-up, bottom position.
Camera: pure side profile with the box on the left.
Setup: a plyo box about knee height.
Body: both feet are on top of the box, legs straight. Hands on the floor about
shoulder-width, roughly one arm's length in front of the box. Hips stacked high
above the shoulders, so the body forms an inverted "V" with a vertical torso.
Elbows bent, the top of the head lowered toward the floor just in front of the
hands.
Must be correct: feet on the box; hips high; head going down between the
hands.
Avoid: a regular push-up with a flat body, feet on the floor, a handstand.
```

### 23. Cable face pull — `musculacao-cable-face-pull.jpg`
```text
EXERCISE: Cable face pull.
Camera: three-quarter view from behind his right shoulder, so the high elbows
and the split rope are visible.
Setup: a cable machine in front of him, the pulley at forehead height, a rope
attachment with two ends.
Body: he stands facing the machine in a staggered stance and pulls the rope
toward his forehead, pulling the two rope ends apart beside his ears. Elbows
are high and out to the sides, above the hands, shoulders externally rotated,
chest up.
Must be correct: rope pulled to the face; elbows high and wide; hands beside
the ears.
Avoid: pulling to the chest, a low pulley, a straight bar.
```

### 24. Standing calf raise — `musculacao-standing-calf-raise.jpg`
```text
EXERCISE: Standing calf raise on a step, top position.
Camera: pure side profile, close enough to see the feet on the step.
Setup: a low step platform; one dumbbell in each hand.
Body: he stands with only the balls of both feet on the edge of the step,
heels hanging over the edge and raised as HIGH as possible. Knees straight,
body tall, dumbbells hanging at his sides.
Must be correct: balls of the feet on the step edge; heels lifted high;
straight knees.
Avoid: flat feet, bent knees, a squat.
```

### 25. Seated calf raise — `musculacao-seated-calf-raise.jpg`
```text
EXERCISE: Seated calf raise machine, top position.
Camera: pure side profile.
Setup: a seated calf raise machine: a seat, a padded lever resting on the
thighs, a small foot platform, weight plates on the lever.
Body: he sits upright with the knees bent 90 degrees. The padded lever rests on
top of his lower thighs, just above the knees. Only the balls of his feet are
on the platform, heels raised high. Hands on the lever handles.
Must be correct: seated with knees at 90 degrees; pad on the thighs; heels up.
Avoid: standing, the pad on the shoulders, straight legs.
```

### 26. Double-under technique drill — `musculacao-double-under-technique-drill.jpg`
```text
EXERCISE: Double-under (jump rope passing twice per jump).
Camera: pure side profile.
Setup: a thin speed rope with handles.
Body: he is in the air in a small, quick vertical jump: body straight, feet
together a few centimeters above the floor, toes pointed down, knees almost
straight. Elbows close to the ribs, hands at hip height in front of the body,
turning the rope with the wrists. The rope is drawn as a faint motion-blurred
loop passing under the feet, suggesting fast rotation.
Must be correct: small jump with straight body; hands low beside the hips.
Avoid: big tuck jump with knees up, arms swinging wide, rope above the head
only.
```

### 27. Wall-facing handstand hold — `musculacao-wall-facing-handstand-hold.jpg`
```text
EXERCISE: Wall-facing handstand hold (chest to the wall).
Camera: pure side profile, the wall on the right.
Setup: a plain vertical wall.
Body: he is upside down in a handstand with his CHEST AND STOMACH FACING THE
WALL. Hands on the floor about a hand's width from the wall, arms locked
straight, shoulders pushed up toward the ears. Body in one straight vertical
line from hands to feet, only the toes lightly touching the wall, head neutral
between the arms, looking at the floor.
Must be correct: chest facing the wall; body straight and vertical; hands
close to the wall.
Avoid: back to the wall, arched banana back, bent arms, a headstand.
```

### 28. 90/90 hip switches — `musculacao-90-90-hip-switches.jpg`
```text
EXERCISE: 90/90 hip position (seated hip mobility). Not a lunge, not kneeling.
Camera: elevated front view, looking down from about 45 degrees in front of
him, so both bent legs lying on the mat are visible.
Setup: an exercise mat.
Body: he SITS on the floor, buttocks on the mat, torso tall and upright, hands
resting lightly on the mat beside his hips. BOTH legs lie flat on the mat and
BOTH knees are bent at 90 degrees:
- Right (front) leg: the thigh points straight forward from the right hip, the
  knee is bent 90 degrees and the shin lies on the mat pointing to his left,
  in front of his body; the outer side of the right leg touches the mat.
- Left (back) leg: the thigh points out to his left side, the knee is bent 90
  degrees and the shin lies on the mat pointing backward; the inner side of the
  left leg touches the mat.
Seen from above, the two legs form a zigzag of two right angles.
Must be correct: sitting on the buttocks; both knees on the mat at 90 degrees;
no foot standing on the floor.
Avoid: kneeling, half-kneeling lunge, any leg straight, sitting cross-legged,
a foot planted flat with the knee up.
```

### 29. Cossack squat — `musculacao-cossack-squat.jpg`
```text
EXERCISE: Cossack squat.
Camera: front view, so the bent leg and the straight side leg are both clear.
Setup: none.
Body: very wide stance. He squats deep over the right leg: right heel flat,
right knee fully bent and tracking over the toes. The left leg is completely
straight, extended out to the side, with the left heel on the floor and the
toes pointing UP. Torso upright, hands clasped in front of the chest.
Must be correct: one deep bent leg; the other straight with toes up.
Avoid: a regular side lunge with both feet flat, both knees bent.
```

### 30. Cable external rotation — `musculacao-cable-external-rotation.jpg`
```text
EXERCISE: Standing cable external rotation (rotator cuff).
Camera: front view of the athlete, the cable machine at the left edge.
Setup: a cable machine on his left, the pulley at elbow height, a single
D-handle; a small rolled towel.
Body: he stands with his left side toward the machine and holds the handle in
his RIGHT hand. The right elbow is bent 90 degrees and pinned against his ribs
with the rolled towel between elbow and ribs. The right forearm rotates
OUTWARD, away from his belly, pulling the cable across his body. Shoulders
level, torso still.
Must be correct: elbow fixed at the side at 90 degrees; forearm rotating
outward; cable crossing in front of the body.
Avoid: straight arm, lateral raise, elbow lifted away from the ribs.
```

### 31. Bulgarian split squat — `musculacao-bulgarian-split-squat.jpg`
```text
EXERCISE: Dumbbell Bulgarian split squat, bottom position.
Camera: pure side profile with the bench on the left.
Setup: a flat bench behind him; one dumbbell in each hand.
Body: his rear foot rests laces-down on the bench behind him. The front foot is
flat on the floor, well in front. At the bottom: front thigh about parallel to
the floor, front knee over the mid-foot, the back knee hovering just above the
floor. Torso upright, dumbbells hanging straight down at his sides.
Must be correct: rear foot on the bench; deep front-leg squat; dumbbells at
the sides.
Avoid: both feet on the floor (regular lunge), front foot on the bench, a
barbell.
```

### 32. Romanian deadlift — `musculacao-romanian-deadlift.jpg`
```text
EXERCISE: Barbell Romanian deadlift, bottom position.
Camera: pure side profile, so the flat back and the hip hinge are clear.
Setup: an Olympic barbell with one black bumper plate on each side.
Body: overhand grip, arms straight and vertical. Hips pushed far BACK behind
the heels, knees almost straight (only about 15 degrees of bend), shins
vertical. The back is flat and neutral from head to hips,
torso inclined about 45 degrees. The bar has slid down the front of the thighs
to just below the knees, staying close to the legs.
Must be correct: hip hinge with a flat back; soft knees; bar close to the
legs.
Avoid: a conventional deadlift setup with the knees bent and the bar at the
shins, a squat, a rounded back, the bar touching the floor.
```

### 33. Hanging knee raise — `musculacao-hanging-knee-raise.jpg`
```text
EXERCISE: Hanging knee raise, top position.
Camera: pure side profile.
Setup: a pull-up bar on a simple gym rig, high enough that his feet hang well
above the floor.
Body: overhand grip, arms straight. Both knees are raised together to hip
height or higher, knees bent about 90 degrees, thighs parallel to the floor,
pelvis tucked slightly forward, no swing.
Must be correct: hanging with straight arms; knees up at hip height.
Avoid: toes-to-bar with straight legs, bent arms, swinging.
```
