import SwiftUI

struct WatchContentView: View {
    @StateObject private var store = WatchEventStore()

    var body: some View {
        NavigationStack {
            if let invite = store.invite {
                ScrollView {
                    VStack(spacing: 10) {
                        Text("Crew Join QR")
                            .font(.headline)
                            .foregroundStyle(.pink)

                        Text(invite.eventName)
                            .font(.caption)
                            .fontWeight(.semibold)
                            .multilineTextAlignment(.center)
                            .lineLimit(2)

                        QRCodeView(value: invite.qrData, size: 128)

                        VStack(spacing: 2) {
                            Text("PIN")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                            Text(invite.accessPin)
                                .font(.title3.monospacedDigit())
                                .fontWeight(.bold)
                        }
                        .padding(.top, 2)

                        Text("Scan to join")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.horizontal, 6)
                    .padding(.vertical, 8)
                }
                .navigationTitle("Stag & Hen")
            } else {
                VStack(spacing: 8) {
                    Image(systemName: "qrcode")
                        .font(.title2)
                        .foregroundStyle(.pink)
                    Text("Open the iPhone app to send an event QR.")
                        .font(.caption)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.secondary)
                }
                .padding()
                .navigationTitle("Stag & Hen")
            }
        }
    }
}

#Preview {
    WatchContentView()
}
