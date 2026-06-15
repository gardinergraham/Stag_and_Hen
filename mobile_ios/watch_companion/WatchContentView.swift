import SwiftUI

struct WatchContentView: View {
    @StateObject private var store = WatchEventStore()

    var body: some View {
        NavigationStack {
            if let invite = store.invite {
                TabView {
                    WatchInviteView(invite: invite)
                    WatchPartyCardsView(cards: invite.games?.partyCards ?? [])
                    WatchSpinnerView(choices: invite.games?.spinnerChoices ?? [])
                    WatchMissionView(prompts: invite.games?.missionPrompts ?? [])
                }
                .tabViewStyle(.page)
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

private struct WatchInviteView: View {
    let invite: WatchEventInvite

    var body: some View {
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
    }
}

private struct WatchPartyCardsView: View {
    let cards: [WatchPartyCard]
    @State private var selectedIndex = 0

    private var selectedCard: WatchPartyCard? {
        guard !cards.isEmpty else { return nil }
        return cards[selectedIndex % cards.count]
    }

    var body: some View {
        VStack(spacing: 8) {
            Text("Party Card")
                .font(.headline)
                .foregroundStyle(.pink)

            if let selectedCard {
                Text(selectedCard.title)
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .multilineTextAlignment(.center)

                Text(selectedCard.prompt)
                    .font(.caption)
                    .multilineTextAlignment(.center)
                    .lineLimit(5)

                Text("\(selectedCard.points) pts")
                    .font(.caption2.monospacedDigit())
                    .foregroundStyle(.secondary)

                Button("Draw") {
                    selectedIndex = Int.random(in: 0..<cards.count)
                }
                .buttonStyle(.borderedProminent)
            } else {
                Text("Open the iPhone app to send party cards.")
                    .font(.caption)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, 8)
    }
}

private struct WatchSpinnerView: View {
    let choices: [WatchSpinnerChoice]
    @State private var result = "Tap Spin"

    var body: some View {
        VStack(spacing: 8) {
            Text("Spinner")
                .font(.headline)
                .foregroundStyle(.pink)

            Text(result)
                .font(.title3)
                .fontWeight(.bold)
                .multilineTextAlignment(.center)
                .lineLimit(3)

            Button("Spin") {
                guard let choice = choices.randomElement() else {
                    result = "No choices yet"
                    return
                }
                result = Bool.random() ? choice.left : choice.right
            }
            .buttonStyle(.borderedProminent)

            Text(choices.randomElement()?.title ?? "Phone sync needed")
                .font(.caption2)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, 8)
    }
}

private struct WatchMissionView: View {
    let prompts: [String]
    @State private var selectedPrompt: String?

    var body: some View {
        VStack(spacing: 8) {
            Text("Secret Mission")
                .font(.headline)
                .foregroundStyle(.pink)

            Text(selectedPrompt ?? "Tap for a discreet mission.")
                .font(.caption)
                .multilineTextAlignment(.center)
                .lineLimit(6)

            Button(selectedPrompt == nil ? "Reveal" : "New") {
                selectedPrompt = prompts.randomElement() ?? "Open the iPhone app to send missions."
            }
            .buttonStyle(.borderedProminent)

            Text("Keep it quiet")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 8)
    }
}

#Preview {
    WatchContentView()
}
