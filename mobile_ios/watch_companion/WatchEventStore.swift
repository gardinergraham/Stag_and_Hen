import Foundation
import SwiftUI

struct WatchEventInvite: Codable, Equatable {
    var version: Int?
    var eventName: String
    var accessPin: String
    var qrData: String
    var eventType: String?
    var games: WatchGames?
    var updatedAt: String

    static let preview = WatchEventInvite(
        version: 1,
        eventName: "Sophie's Hen Weekend",
        accessPin: "123456",
        qrData: "stagandhen://join?data=eyJhcHAiOiAic3RhZ2FuZGhlbiIsICJ2ZXJzaW9uIjogMSwgImV2ZW50X2lkIjogInByZXZpZXciLCAiZXZlbnRfbmFtZSI6ICJTb3BoaWUncyBIZW4gV2Vla2VuZCIsICJwaW4iOiAiMTIzNDU2In0=",
        eventType: "hen",
        games: .preview,
        updatedAt: "2026-05-28T10:00:00.000Z"
    )
}

struct WatchGames: Codable, Equatable {
    var partyCards: [WatchPartyCard]
    var spinnerChoices: [WatchSpinnerChoice]
    var missionPrompts: [String]

    static let preview = WatchGames(
        partyCards: [
            WatchPartyCard(id: "story-time", title: "Story Time", prompt: "Tell the funniest memory you have with the guest of honour.", points: 10),
            WatchPartyCard(id: "photo-proof", title: "Photo Proof", prompt: "Take a group selfie with everyone doing the same dramatic pose.", points: 15),
            WatchPartyCard(id: "mini-toast", title: "Mini Toast", prompt: "Give a short toast to the bride or groom.", points: 15),
        ],
        spinnerChoices: [
            WatchSpinnerChoice(id: "forfeit-pass", title: "Forfeit or Free Pass", left: "Forfeit", right: "Free Pass"),
            WatchSpinnerChoice(id: "truth-photo", title: "Truth or Photo", left: "Truth", right: "Photo"),
        ],
        missionPrompts: [
            "Get someone to say a secret word.",
            "Take a selfie with the guest of honour.",
            "Start a group cheer without explaining why.",
        ]
    )
}

struct WatchPartyCard: Codable, Equatable, Identifiable {
    var id: String
    var title: String
    var prompt: String
    var points: Int
}

struct WatchSpinnerChoice: Codable, Equatable, Identifiable {
    var id: String
    var title: String
    var left: String
    var right: String
}

final class WatchEventStore: ObservableObject {
    @Published var invite: WatchEventInvite?

    init(invite: WatchEventInvite? = WatchEventInvite.preview) {
        self.invite = invite
    }

    func update(from payload: [String: Any]) {
        guard
            let eventName = payload["eventName"] as? String,
            let accessPin = payload["accessPin"] as? String,
            let qrData = payload["qrData"] as? String
        else {
            return
        }

        invite = WatchEventInvite(
            version: payload["version"] as? Int,
            eventName: eventName,
            accessPin: accessPin,
            qrData: qrData,
            eventType: payload["eventType"] as? String,
            games: decodeGames(from: payload["games"]),
            updatedAt: payload["updatedAt"] as? String ?? ISO8601DateFormatter().string(from: Date())
        )
    }

    private func decodeGames(from value: Any?) -> WatchGames? {
        guard
            let value,
            JSONSerialization.isValidJSONObject(value),
            let data = try? JSONSerialization.data(withJSONObject: value),
            let games = try? JSONDecoder().decode(WatchGames.self, from: data)
        else {
            return nil
        }
        return games
    }
}
