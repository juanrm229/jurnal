import SwiftUI
import WidgetKit

// Snapshot ditulis aplikasi (ExtensionStorage → UserDefaults App Group).
struct SehariSnapshot: Codable {
  let day: String
  let dayLabel: String
  let dateLabel: String
  let dayOfYear: Int
  let sealedToday: Bool
  let doodle: String
  let circleName: String?
  let streak: Int
  let flame: String
  let status: String
  let year: Int
  let sealedDays: Int
  let daysLeft: Int
  let garden: String
}

struct SehariEntry: TimelineEntry {
  let date: Date
  let snap: SehariSnapshot?
}

func loadSnapshot() -> SehariSnapshot? {
  guard let defaults = UserDefaults(suiteName: "group.app.sehari"),
        let raw = defaults.string(forKey: "snapshot"),
        let data = raw.data(using: .utf8) else { return nil }
  return try? JSONDecoder().decode(SehariSnapshot.self, from: data)
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> SehariEntry { SehariEntry(date: Date(), snap: nil) }
  func getSnapshot(in context: Context, completion: @escaping (SehariEntry) -> Void) {
    completion(SehariEntry(date: Date(), snap: loadSnapshot()))
  }
  func getTimeline(in context: Context, completion: @escaping (Timeline<SehariEntry>) -> Void) {
    let entry = SehariEntry(date: Date(), snap: loadSnapshot())
    // Aplikasi memanggil reloadWidget() setiap ada perubahan; ini hanya cadangan.
    let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
    completion(Timeline(entries: [entry], policy: .after(next)))
  }
}

let mono = Font.system(.caption, design: .monospaced)

struct SmallView: View {
  let snap: SehariSnapshot?
  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      HStack {
        Text(snap?.circleName != nil ? "api \(snap!.streak)" : "").font(mono).foregroundColor(Color("Ink"))
        Spacer()
        Text("#\(snap?.dayOfYear ?? 0)").font(mono).foregroundColor(Color("InkSoft"))
      }
      Spacer(minLength: 0)
      HStack {
        Spacer()
        Image(snap.map { $0.sealedToday ? $0.doodle : "penyiram" } ?? "tunas")
          .resizable().renderingMode(.template).foregroundColor(Color("Ink"))
          .frame(width: 64, height: 64)
        Spacer()
      }
      Spacer(minLength: 0)
      Text(snap?.status ?? "buka Sehari").font(.system(size: 10, design: .monospaced)).lineLimit(2)
      HStack {
        Text(snap?.dayLabel ?? "").font(mono).foregroundColor(Color("Ink"))
        Spacer()
        Text(snap?.dateLabel ?? "").font(mono).foregroundColor(Color("InkSoft"))
      }
    }
  }
}

struct GardenView: View {
  let snap: SehariSnapshot?
  var body: some View {
    let cells = Array(snap?.garden ?? "")
    let columns = Array(repeating: GridItem(.flexible(), spacing: 2), count: 26)
    VStack(alignment: .leading, spacing: 6) {
      LazyVGrid(columns: columns, spacing: 2) {
        ForEach(0..<cells.count, id: \.self) { i in
          if cells[i] == "1" {
            Image("tunas").resizable().renderingMode(.template).foregroundColor(Color("Ink")).frame(width: 9, height: 9)
          } else {
            Circle().fill(Color("InkSoft")).frame(width: 2.5, height: 2.5).frame(width: 9, height: 9)
          }
        }
      }
      HStack {
        Text(String(snap?.year ?? 0)).font(mono).foregroundColor(Color("Ink"))
        Spacer()
        Text("\(snap?.daysLeft ?? 0) hari untuk tumbuh").font(mono).foregroundColor(Color("InkSoft"))
      }
    }
  }
}

struct SehariWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: SehariEntry
  var body: some View {
    Group {
      if family == .systemLarge || family == .systemMedium {
        GardenView(snap: entry.snap)
      } else {
        SmallView(snap: entry.snap)
      }
    }
    .containerBackground(Color("$widgetBackground"), for: .widget)
    .widgetURL(URL(string: "sehari://hari-ini"))
  }
}

@main
struct SehariWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "SehariWidget", provider: Provider()) { entry in
      SehariWidgetView(entry: entry)
    }
    .configurationDisplayName("Sehari")
    .description("Api lingkaranmu dan taman tahun ini.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}
