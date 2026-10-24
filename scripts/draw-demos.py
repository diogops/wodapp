"""
Desenha as demonstrações dos exercícios do programa de musculação no padrão
adesivo do app (fundo verde-petróleo, regata laranja, contorno branco), as
mesmas cores de `client/public/demos/exercise-*.png`.

Cada exercício é uma pose: posição do quadril, ângulo do tronco e alvos para
mãos e tornozelos. Cotovelos e joelhos saem de IK de dois ossos. Mundo em
"cm" com y para cima e o chão em y=0.

    python scripts/draw-demos.py [nome ...]   # sem nomes desenha todos
"""
import math, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "client" / "public" / "demos"
W, H, SS = 1200, 900, 2           # tamanho final e supersampling
SCALE = 4.1 * SS                  # px por cm
GROUND = (H - 70) * SS

BG_TOP, BG_BOTTOM = (31, 55, 59), (22, 38, 41)
SKIN, SKIN_FAR = (233, 168, 124), (201, 137, 98)
TANK, TANK_DARK = (224, 94, 52), (190, 74, 38)
SHORTS, SHORTS_FAR = (40, 40, 42), (28, 28, 30)
SHOE, SOCK, HAIR = (214, 66, 44), (240, 240, 236), (59, 42, 32)
INK = (24, 22, 22)
METAL, METAL_DARK, PAD, PLATE = (150, 160, 166), (95, 104, 110), (58, 63, 70), (34, 36, 38)
CABLE, BAND, WALL, ROPE = (200, 205, 208), (86, 160, 210), (70, 92, 96), (230, 200, 60)

# comprimentos em cm
TORSO, NECK, HEAD_R = 52, 9, 11
UPPER_ARM, FOREARM = 30, 27
THIGH, SHIN, FOOT = 43, 43, 15
O = 3.2  # contorno escuro, em px (antes do supersampling)


def V(x, y): return (float(x), float(y))
def add(a, b): return (a[0] + b[0], a[1] + b[1])
def sub(a, b): return (a[0] - b[0], a[1] - b[1])
def mul(a, k): return (a[0] * k, a[1] * k)
def length(a): return math.hypot(*a)
def polar(deg, r=1.0): return (math.cos(math.radians(deg)) * r, math.sin(math.radians(deg)) * r)


def ik(root, target, l1, l2, bend):
    """Junta do meio de uma cadeia de dois ossos; bend=+1 dobra para a esquerda de root→target."""
    d = sub(target, root)
    dist = max(min(length(d), l1 + l2 - 0.01), abs(l1 - l2) + 0.01)
    u = mul(d, 1 / (length(d) or 1))
    a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist)
    h = math.sqrt(max(l1 * l1 - a * a, 0))
    perp = (-u[1], u[0])
    return add(add(root, mul(u, a)), mul(perp, h * bend)), add(root, mul(u, dist))


class Canvas:
    def __init__(self, cx=0):
        # camada maior que a tela: a pose é desenhada livre e enquadrada em save()
        self.layer = Image.new("RGBA", (2 * W * SS, 2 * H * SS), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.layer)
        self.cx = W * SS - cx * SCALE

    def P(self, p): return (self.cx + p[0] * SCALE, 1.5 * H * SS - p[1] * SCALE)

    def seg(self, a, b, w, color, ink=True):
        """Segmento com pontas redondas; w em cm."""
        A, B = self.P(a), self.P(b)
        for width, col in ([(w * SCALE + 2 * O * SS, INK)] if ink else []) + [(w * SCALE, color)]:
            r = width / 2
            self.d.line([A, B], fill=col, width=int(width))
            for x, y in (A, B):
                self.d.ellipse([x - r, y - r, x + r, y + r], fill=col)

    def circle(self, c, r, color, ink=True):
        x, y = self.P(c)
        R = r * SCALE
        if ink:
            self.d.ellipse([x - R - O * SS, y - R - O * SS, x + R + O * SS, y + R + O * SS], fill=INK)
        self.d.ellipse([x - R, y - R, x + R, y + R], fill=color)

    def rect(self, x0, y0, x1, y1, color, radius=2):
        a, b = self.P((x0, y1)), self.P((x1, y0))
        self.d.rounded_rectangle([a[0] - O * SS, a[1] - O * SS, b[0] + O * SS, b[1] + O * SS], radius * SCALE + O * SS, fill=INK)
        self.d.rounded_rectangle([a, b], radius * SCALE, fill=color)

    def poly(self, pts, color):
        pts = [self.P(p) for p in pts]
        self.d.polygon(pts, fill=color, outline=INK, width=int(O * SS))

    def arc_line(self, pts, w, color):
        for a, b in zip(pts, pts[1:]):
            self.seg(a, b, w, color, ink=False)

    def save(self, name):
        bg = Image.new("RGB", (W * SS, H * SS))
        g = ImageDraw.Draw(bg)
        for y in range(H * SS):
            t = y / (H * SS)
            g.line([(0, y), (W * SS, y)], fill=tuple(int(BG_TOP[i] + (BG_BOTTOM[i] - BG_TOP[i]) * t) for i in range(3)))
        # enquadra: a pose inteira cabe na tela, apoiada na linha do chão
        layer = self.layer.crop(self.layer.getbbox())
        k = min(W * SS * 0.84 / layer.width, (GROUND - 60 * SS) / layer.height, 1.25)
        layer = layer.resize((int(layer.width * k), int(layer.height * k)), Image.LANCZOS)
        x0, y0 = (W * SS - layer.width) // 2, int(GROUND - layer.height)
        half = layer.width * 0.6
        g.ellipse([W * SS / 2 - half, GROUND - 14 * SS, W * SS / 2 + half, GROUND + 14 * SS], fill=(18, 31, 33))
        alpha = Image.new("L", bg.size, 0)
        alpha.paste(layer.split()[3], (x0, y0))
        # dilatação por blur + limiar: MaxFilter desse tamanho leva minutos por imagem
        sticker = alpha.filter(ImageFilter.GaussianBlur(7 * SS)).point(lambda v: 255 if v > 6 else 0)
        bg.paste((248, 248, 244), mask=sticker)
        bg.paste(layer, (x0, y0), mask=layer.split()[3])
        bg = bg.resize((W, H), Image.LANCZOS)
        bg.save(OUT / name, optimize=True)


# --- equipamento ---------------------------------------------------------------

def plate(c, p, r=22):
    """Anilha vista de frente (a barra atravessa a tela)."""
    c.circle(p, r, PLATE)
    c.circle(p, r * 0.32, METAL)

def bar_end(c, p):
    c.circle(p, 3.2, METAL)

def rig(c, x_post, x_end, y):
    """Barra fixa: poste atrás e travessa até a mão."""
    c.seg(V(x_post, 0), V(x_post, y + 8), 6, METAL_DARK)
    c.seg(V(x_post, y), V(x_end, y), 4.5, METAL)

def wall(c, x, side=1):
    x0, x1 = (x, x + 26) if side > 0 else (x - 26, x)
    c.rect(x0, 0, x1, 215, WALL, radius=1)

def bench(c, x0, x1, h, pad=True):
    c.seg(V(x0 + 6, 0), V(x0 + 6, h - 4), 4, METAL_DARK)
    c.seg(V(x1 - 6, 0), V(x1 - 6, h - 4), 4, METAL_DARK)
    c.rect(x0, h - 8, x1, h, PAD if pad else METAL, radius=3)

def column(c, x, top=200):
    """Torre de polia."""
    c.rect(x - 9, 0, x + 9, top, METAL_DARK, radius=2)
    c.rect(x - 6, 10, x + 6, 55, PLATE, radius=1)

def cable(c, a, b):
    c.seg(a, b, 1.4, CABLE, ink=False)

def dumbbell(c, p):
    c.seg(add(p, V(-5, 0)), add(p, V(5, 0)), 3, METAL)
    c.circle(add(p, V(-6, 0)), 5.5, PLATE)
    c.circle(add(p, V(6, 0)), 5.5, PLATE)


# --- figura ----------------------------------------------------------------

def figure(c, hip, torso, hands, ankles, elbows=(-1, -1), knees=(1, 1), feet=(0, 0), head=0, front=False, grip=True):
    """
    hip: posição do quadril; torso: ângulo hip→ombro em graus.
    hands/ankles: (perto, longe); elbows/knees: lado da dobra (ver ik);
    feet: ângulo do pé em graus (0 = para a frente/direita).
    front=True desenha de frente: ombros e quadris afastados no plano.
    """
    up = polar(torso)
    side = (up[1], -up[0])  # para a "direita" do tronco
    shoulder = add(hip, mul(up, TORSO))
    neck_base = add(hip, mul(up, TORSO + 2))
    head_c = add(neck_base, polar(torso + head, NECK + HEAD_R))
    sh_off, hip_off = (13, 8) if front else (0, 0)
    shoulders = (add(shoulder, mul(side, sh_off)), add(shoulder, mul(side, -sh_off)))
    hips = (add(hip, mul(side, hip_off)), add(hip, mul(side, -hip_off)))

    def leg(i, skin, shorts):
        knee, ankle = ik(hips[i], ankles[i], THIGH, SHIN, knees[i])
        toe = add(ankle, polar(feet[i] if not front else -90 + (12 if i == 0 else -12), FOOT if not front else 6))
        heel = add(ankle, polar((feet[i] + 180) if not front else -90, 3))
        c.seg(knee, ankle, 9.5, skin)
        c.seg(ankle, add(ankle, mul(sub(knee, ankle), 0.12)), 9, SOCK)
        c.seg(heel, toe, 9, SHOE)
        c.seg(hips[i], knee, 13, skin)
        c.seg(hips[i], add(hips[i], mul(sub(knee, hips[i]), 0.55)), 15, shorts)

    def arm(i, skin):
        elbow, hand = ik(shoulders[i], hands[i], UPPER_ARM, FOREARM, elbows[i])
        c.seg(shoulders[i], elbow, 9.5, skin)
        c.seg(elbow, hand, 8.5, skin)
        c.circle(hand, 5 if grip else 4.5, skin)
        return hand

    leg(1, SKIN_FAR, SHORTS_FAR)
    arm(1, SKIN_FAR)
    # tronco: regata + bermuda por baixo
    c.seg(hip, add(hip, mul(up, 6)), 26 if not front else 30, SHORTS)
    if front:
        c.poly([add(hips[0], mul(side, 7)), add(shoulders[0], mul(side, 5)), add(shoulders[1], mul(side, -5)), add(hips[1], mul(side, -7))], TANK)
    else:
        c.seg(add(hip, mul(up, 9)), add(shoulder, mul(up, -3)), 27, TANK)
    c.seg(neck_base, head_c, 8, SKIN)
    c.circle(head_c, HEAD_R, SKIN)
    hx, hy = c.P(head_c)
    R = HEAD_R * SCALE
    if front:
        c.d.pieslice([hx - R, hy - R, hx + R, hy + R], 180, 360, fill=HAIR)
    else:
        # cabelo na parte de trás/de cima; o rosto olha para +x do tronco
        a = -(torso + head)  # PIL mede ângulo no sentido horário
        c.d.pieslice([hx - R, hy - R, hx + R, hy + R], a - 10 - 150 + 60, a + 60 + 10, fill=HAIR)
        eye = add(head_c, add(polar(torso + head, 2), polar(torso + head - 90, 6)))
        ex, ey = c.P(eye)
        c.d.ellipse([ex - 1.6 * SS * 2, ey - 1.6 * SS * 2, ex + 1.6 * SS * 2, ey + 1.6 * SS * 2], fill=INK)
    leg(0, SKIN, SHORTS)
    return arm(0, SKIN)


# --- poses -----------------------------------------------------------------
# Convenção: o atleta olha para a direita (+x).

def front_rack_stretch(c):
    c.seg(V(48, 0), V(48, 175), 6, METAL_DARK)
    plate(c, V(16, 130))
    figure(c, V(0, 86), 88, (V(14, 130), V(12, 131)), (V(4, 9), V(-4, 9)), elbows=(1, 1))
    bar_end(c, V(16, 130))

def knee_to_wall(c):
    wall(c, 62)
    figure(c, V(-5, 52), 80, (V(60, 105), V(60, 110)), (V(34, 9), V(-45, 9)), elbows=(1, 1), knees=(1, 1), feet=(0, 170))
    # joelho de trás no chão é obtido pela IK: tornozelo longe atrás

def clean_pull(c):
    plate(c, V(10, 74))
    hand = figure(c, V(0, 92), 98, (V(9, 74), V(8, 74)), (V(2, 14), V(-2, 14)), elbows=(1, 1), feet=(-55, -55), head=-6)
    bar_end(c, hand)

def front_squat(c):
    plate(c, V(20, 107))
    hand = figure(c, V(-22, 47), 72, (V(18, 108), V(16, 109)), (V(10, 9), V(4, 9)), elbows=(1, 1), knees=(1, 1), head=12)
    bar_end(c, V(20, 107))

def leg_press(c):
    # assento inclinado e plataforma a 45°
    c.poly([V(-95, 20), V(-35, 20), V(-75, 85), V(-108, 70)], PAD)
    c.seg(V(-100, 0), V(-60, 20), 6, METAL_DARK)
    c.seg(V(60, 0), V(90, 120), 7, METAL_DARK)
    c.poly([V(28, 70), V(56, 42), V(64, 50), V(36, 78)], METAL)
    figure(c, V(-48, 36), 150, (V(-40, 28), V(-44, 30)), (V(36, 66), V(32, 62)), elbows=(1, 1), knees=(1, 1), feet=(45, 45), head=-25)

def lying_leg_curl(c):
    bench(c, -70, 70, 52)
    figure(c, V(-12, 62), 0, (V(55, 55), V(52, 52)), (V(-30, 100), V(-34, 98)), elbows=(-1, -1), knees=(1, 1), feet=(90, 90), head=25)
    c.circle(V(-28, 104), 6, PAD)

def spanish_squat(c):
    c.seg(V(62, 0), V(62, 140), 6, METAL_DARK)
    figure(c, V(-26, 50), 82, (V(40, 105), V(38, 104)), (V(12, 9), V(6, 9)), elbows=(1, 1), knees=(1, 1))
    c.seg(V(16, 52), V(62, 50), 3, BAND, ink=False)

def pallof_press(c):
    column(c, -85)
    hand = figure(c, V(0, 78), 92, (V(46, 118), V(44, 118)), (V(14, 9), V(-14, 9)), elbows=(1, 1), knees=(1, -1))
    cable(c, V(-80, 118), hand)

def wrist_mobility(c):
    figure(c, V(-25, 50), 15, (V(32, 5), V(28, 5)), (V(-55, 6), V(-58, 6)), elbows=(1, 1), knees=(1, 1), feet=(180, 180), head=-60, grip=False)

def hang(c, hip, torso, hands, ankles, elbows=(1, 1), knees=(-1, -1), feet=(-60, -60), head=0):
    up = lambda p: V(p[0], p[1] + 45)  # barra alta o bastante para os pés não tocarem o chão
    hip, hands, ankles = up(hip), tuple(map(up, hands)), tuple(map(up, ankles))
    bar_y = hands[0][1]
    rig(c, -60, hands[0][0] + 6, bar_y)
    figure(c, hip, torso, hands, ankles, elbows=elbows, knees=knees, feet=feet, head=head)

def scapular_pull_up(c):
    hang(c, V(0, 70), 92, (V(6, 186), V(5, 186)), (V(2, -8), V(0, -8)), feet=(-70, -70))

def dead_hang(c):
    hang(c, V(0, 66), 91, (V(5, 186), V(4, 186)), (V(1, -12), V(-1, -12)), feet=(-75, -75))

def strict_pull_up(c):
    hang(c, V(-6, 115), 88, (V(4, 186), V(3, 186)), (V(-4, 30), V(-6, 30)), elbows=(1, 1), feet=(-70, -70), head=-8)

def chest_to_bar(c):
    hang(c, V(-14, 118), 70, (V(6, 186), V(5, 186)), (V(10, 40), V(8, 40)), elbows=(1, 1), knees=(1, 1), feet=(-40, -40), head=-15)

def hanging_knee_raise(c):
    hang(c, V(-3, 112), 95, (V(4, 186), V(3, 186)), (V(22, 82), V(20, 82)), knees=(1, 1), feet=(-90, -90))

def arch_hold(c):
    figure(c, V(0, 14), 10, (V(108, 36), V(106, 34)), (V(-84, 30), V(-86, 28)), elbows=(1, 1), knees=(1, 1), feet=(190, 190), head=12, grip=False)

def hollow_hold(c):
    figure(c, V(0, 12), 165, (V(-104, 40), V(-102, 38)), (V(82, 38), V(80, 36)), elbows=(1, 1), knees=(-1, -1), feet=(25, 25), head=-20, grip=False)

def lat_pulldown(c):
    c.rect(-60, 0, -48, 220, METAL_DARK)
    c.seg(V(-54, 212), V(12, 212), 4, METAL)
    bench(c, -40, 22, 48)
    c.rect(18, 66, 32, 76, PAD, radius=4)
    hand = figure(c, V(-14, 54), 98, (V(-6, 138), V(-8, 138)), (V(32, 9), V(30, 9)), elbows=(-1, -1), knees=(-1, -1), head=-10)
    cable(c, V(10, 212), hand)
    c.seg(add(hand, V(-14, 0)), add(hand, V(14, 0)), 3, METAL)

def strict_dip(c):
    c.seg(V(-12, 0), V(-12, 112), 5, METAL_DARK)
    c.seg(V(34, 0), V(34, 112), 5, METAL_DARK)
    c.seg(V(-12, 112), V(34, 112), 4, METAL)
    figure(c, V(-4, 72), 75, (V(10, 114), V(9, 114)), (V(-38, 34), V(-40, 32)), elbows=(1, 1), knees=(-1, -1), feet=(-30, -30), head=-8)

def seated_cable_row(c):
    column(c, 120, top=60)
    bench(c, -60, 50, 32)
    c.rect(68, 18, 76, 52, METAL, radius=2)
    hand = figure(c, V(-20, 40), 95, (V(8, 75), V(6, 75)), (V(64, 38), V(62, 36)), elbows=(1, 1), knees=(1, 1), feet=(80, 80))
    cable(c, V(112, 40), hand)

def wall_slide(c):
    wall(c, -45, side=-1)
    figure(c, V(-26, 86), 90, (V(-36, 192), V(-38, 190)), (V(-10, 9), V(-14, 9)), elbows=(1, 1))

def overhead_squat(c):
    hand = figure(c, V(-24, 46), 70, (V(-4, 178), V(-6, 178)), (V(10, 9), V(4, 9)), elbows=(1, 1), knees=(1, 1), head=12)
    c.seg(add(hand, V(-26, -6)), add(hand, V(26, 6)), 3.4, (238, 238, 232))

def strict_press(c):
    plate(c, V(6, 199))
    figure(c, V(0, 86), 92, (V(6, 196), V(4, 196)), (V(4, 9), V(-4, 9)), elbows=(1, 1))
    bar_end(c, V(6, 199))

def pike_push_up(c):
    c.rect(-112, 0, -68, 45, PAD, radius=3)
    figure(c, V(-30, 115), -70, (V(2, 8), V(0, 8)), (V(-84, 54), V(-86, 54)), elbows=(-1, -1), knees=(1, 1), feet=(-100, -100), head=0, grip=False)

def face_pull(c):
    column(c, 105)
    hand = figure(c, V(-8, 82), 96, (V(24, 160), V(22, 159)), (V(10, 9), V(-14, 9)), elbows=(-1, -1), knees=(1, -1))
    cable(c, V(98, 165), hand)

def standing_calf_raise(c):
    c.rect(-30, 0, 30, 12, PAD, radius=2)
    figure(c, V(0, 108), 90, (V(4, 82), V(2, 82)), (V(-2, 24), V(-4, 24)), elbows=(1, 1), feet=(-50, -50))
    dumbbell(c, V(4, 78))

def seated_calf_raise(c):
    bench(c, -60, 0, 48)
    c.rect(-6, 0, 34, 10, PAD, radius=2)
    c.rect(4, 58, 38, 68, PAD, radius=4)
    figure(c, V(-22, 52), 92, (V(20, 70), V(18, 70)), (V(26, 20), V(24, 20)), elbows=(1, 1), knees=(1, 1), feet=(-35, -35))

def double_under(c):
    figure(c, V(0, 106), 92, (V(18, 92), V(15, 92)), (V(4, 32), V(-2, 30)), elbows=(1, 1), knees=(1, 1), feet=(-35, -35))
    pts = [V(16 + math.cos(math.radians(a)) * 40, 120 + math.sin(math.radians(a)) * 100) for a in range(0, 361, 6)]
    c.arc_line(pts, 1.6, ROPE)

def handstand_wall(c):
    wall(c, 30)
    figure(c, V(6, 128), -90, (V(-4, 4), V(-6, 4)), (V(22, 205), V(20, 205)), elbows=(1, 1), knees=(-1, -1), feet=(90, 90), head=0, grip=False)

def hip_90_90(c):
    figure(c, V(-6, 14), 95, (V(-36, 6), V(-34, 6)), (V(8, 8), V(-14, 6)), elbows=(-1, -1), knees=(1, -1), feet=(180, 0))

def cossack_squat(c):
    figure(c, V(-25, 40), 82, (V(-6, 62), V(-44, 62)), (V(-38, 9), V(75, 9)), elbows=(1, -1), knees=(1, 1), front=True)

def cable_external_rotation(c):
    column(c, -95)
    hand = figure(c, V(0, 86), 90, (V(-34, 112), V(-14, 92)), (V(10, 9), V(-10, 9)), elbows=(-1, 1), front=True)
    cable(c, V(-88, 112), hand)

def bulgarian_split_squat(c):
    bench(c, -88, -40, 48)
    figure(c, V(-12, 60), 86, (V(-8, 32), V(-10, 32)), (V(28, 9), V(-60, 52)), elbows=(1, 1), knees=(1, 1), feet=(0, 160))
    dumbbell(c, V(-8, 28))

def romanian_deadlift(c):
    plate(c, V(16, 48))
    hand = figure(c, V(-26, 88), 22, (V(14, 48), V(12, 48)), (V(-6, 9), V(-12, 9)), elbows=(1, 1), knees=(1, 1), head=-20)
    bar_end(c, V(16, 48))


POSES = {
    "front-rack-stretch": front_rack_stretch,
    "knee-to-wall-ankle-mobility": knee_to_wall,
    "clean-pull": clean_pull,
    "front-squat": front_squat,
    "leg-press": leg_press,
    "lying-leg-curl": lying_leg_curl,
    "spanish-squat-isometric": spanish_squat,
    "pallof-press": pallof_press,
    "wrist-extension-mobility": wrist_mobility,
    "scapular-pull-up": scapular_pull_up,
    "arch-hold": arch_hold,
    "chest-to-bar-pull-up": chest_to_bar,
    "strict-pull-up": strict_pull_up,
    "lat-pulldown": lat_pulldown,
    "strict-bar-dip": strict_dip,
    "seated-cable-row": seated_cable_row,
    "hollow-body-hold": hollow_hold,
    "dead-hang": dead_hang,
    "wall-slide": wall_slide,
    "overhead-squat-pvc": overhead_squat,
    "strict-press": strict_press,
    "pike-push-up": pike_push_up,
    "cable-face-pull": face_pull,
    "standing-calf-raise": standing_calf_raise,
    "seated-calf-raise": seated_calf_raise,
    "double-under-technique-drill": double_under,
    "wall-facing-handstand-hold": handstand_wall,
    "90-90-hip-switches": hip_90_90,
    "cossack-squat": cossack_squat,
    "cable-external-rotation": cable_external_rotation,
    "bulgarian-split-squat": bulgarian_split_squat,
    "romanian-deadlift": romanian_deadlift,
    "hanging-knee-raise": hanging_knee_raise,
}

if __name__ == "__main__":
    names = sys.argv[1:] or list(POSES)
    for name in names:
        c = Canvas()
        POSES[name](c)
        c.save(f"musculacao-{name}.png")
        print("ok", name)
