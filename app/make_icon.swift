// Zeichnet das App-Icon (1024×1024 PNG): dunkle Kachel, Metronom mit blauem Pendel und Leuchten.
import Cocoa

let size: CGFloat = 1024
let out = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "icon.png"
// "full": randlose quadratische Variante für iPhone/Web-App (iOS rundet die Ecken selbst)
let fullBleed = CommandLine.arguments.count > 2 && CommandLine.arguments[2] == "full"

let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(size), pixelsHigh: Int(size),
                           bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                           colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
let ctx = NSGraphicsContext.current!.cgContext
let rgb = CGColorSpaceCreateDeviceRGB()
func col(_ r: CGFloat, _ g: CGFloat, _ b: CGFloat, _ a: CGFloat = 1) -> CGColor { CGColor(red: r/255, green: g/255, blue: b/255, alpha: a) }
let blue = col(74, 168, 220)

// Kachel (macOS-Raster: 824 px mit Rand 100 px)
let tile = fullBleed ? CGRect(x: 0, y: 0, width: size, height: size) : CGRect(x: 100, y: 100, width: 824, height: 824)
let radius: CGFloat = fullBleed ? 0 : 185
let tilePath = CGPath(roundedRect: tile, cornerWidth: radius, cornerHeight: radius, transform: nil)
if !fullBleed {
    ctx.saveGState()
    ctx.setShadow(offset: CGSize(width: 0, height: -12), blur: 28, color: col(0, 0, 0, 0.5))
    ctx.addPath(tilePath); ctx.setFillColor(col(0, 0, 0)); ctx.fillPath()
    ctx.restoreGState()
}

ctx.saveGState()
ctx.addPath(tilePath); ctx.clip()
let bg = CGGradient(colorsSpace: rgb, colors: [col(30, 30, 32), col(4, 4, 6)] as CFArray, locations: [0, 1])!
ctx.drawLinearGradient(bg, start: CGPoint(x: 512, y: tile.maxY), end: CGPoint(x: 512, y: tile.minY), options: [])

// Blaues Leuchten unten
let glow = CGGradient(colorsSpace: rgb, colors: [col(74, 168, 220, 0.75), col(74, 168, 220, 0.18), col(74, 168, 220, 0)] as CFArray, locations: [0, 0.4, 1])!
ctx.saveGState()
ctx.translateBy(x: 512, y: 150); ctx.scaleBy(x: 1.6, y: 0.75)
ctx.drawRadialGradient(glow, startCenter: .zero, startRadius: 0, endCenter: .zero, endRadius: 330, options: [])
ctx.restoreGState()

// Sockel
let base = CGPath(roundedRect: CGRect(x: 250, y: 205, width: 524, height: 46), cornerWidth: 18, cornerHeight: 18, transform: nil)
ctx.addPath(base); ctx.setFillColor(col(58, 58, 62)); ctx.fillPath()

// Gehäuse (Trapez mit abgerundeten Ecken)
let body = CGMutablePath()
body.move(to: CGPoint(x: 512, y: 250))
body.addArc(tangent1End: CGPoint(x: 290, y: 250), tangent2End: CGPoint(x: 432, y: 800), radius: 22)
body.addArc(tangent1End: CGPoint(x: 432, y: 800), tangent2End: CGPoint(x: 592, y: 800), radius: 30)
body.addArc(tangent1End: CGPoint(x: 592, y: 800), tangent2End: CGPoint(x: 734, y: 250), radius: 30)
body.addArc(tangent1End: CGPoint(x: 734, y: 250), tangent2End: CGPoint(x: 290, y: 250), radius: 22)
body.closeSubpath()
ctx.saveGState()
ctx.addPath(body); ctx.clip()
let bodyGrad = CGGradient(colorsSpace: rgb, colors: [col(70, 70, 76), col(36, 36, 40)] as CFArray, locations: [0, 1])!
ctx.drawLinearGradient(bodyGrad, start: CGPoint(x: 512, y: 800), end: CGPoint(x: 512, y: 250), options: [])
ctx.restoreGState()
ctx.addPath(body); ctx.setStrokeColor(col(95, 95, 102)); ctx.setLineWidth(6); ctx.strokePath()

// Skala
ctx.setStrokeColor(col(120, 120, 128)); ctx.setLineWidth(5); ctx.setLineCap(.round)
for i in 0..<7 {
    let y = 430 + CGFloat(i) * 46
    let half: CGFloat = 26 - CGFloat(i) * 1.5
    ctx.move(to: CGPoint(x: 512 - half, y: y)); ctx.addLine(to: CGPoint(x: 512 + half, y: y))
}
ctx.strokePath()

// Pendel (geneigt) mit Gewicht
let pivot = CGPoint(x: 512, y: 330)
let angle: CGFloat = 0.36
let len: CGFloat = 560
let tip = CGPoint(x: pivot.x + sin(angle) * len, y: pivot.y + cos(angle) * len)
ctx.saveGState()
ctx.setShadow(offset: .zero, blur: 40, color: col(74, 168, 220, 0.9))
ctx.setStrokeColor(blue); ctx.setLineWidth(20); ctx.setLineCap(.round)
ctx.move(to: pivot); ctx.addLine(to: tip); ctx.strokePath()
ctx.translateBy(x: pivot.x + sin(angle) * len * 0.62, y: pivot.y + cos(angle) * len * 0.62)
ctx.rotate(by: -angle)
let weight = CGPath(roundedRect: CGRect(x: -46, y: -34, width: 92, height: 68), cornerWidth: 14, cornerHeight: 14, transform: nil)
ctx.addPath(weight); ctx.setFillColor(blue); ctx.fillPath()
ctx.restoreGState()
ctx.addEllipse(in: CGRect(x: pivot.x - 22, y: pivot.y - 22, width: 44, height: 44))
ctx.setFillColor(col(200, 200, 205)); ctx.fillPath()

ctx.restoreGState()
NSGraphicsContext.current = nil
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: out))
