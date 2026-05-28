import Foundation
import SwiftUI

struct WatchEventInvite: Codable, Equatable {
    var eventName: String
    var accessPin: String
    var qrData: String
    var updatedAt: String

    static let preview = WatchEventInvite(
        eventName: "Sophie's Hen Weekend",
        accessPin: "123456",
        qrData: "stagandhen://join?data=eyJhcHAiOiAic3RhZ2FuZGhlbiIsICJ2ZXJzaW9uIjogMSwgImV2ZW50X2lkIjogInByZXZpZXciLCAiZXZlbnRfbmFtZSI6ICJTb3BoaWUncyBIZW4gV2Vla2VuZCIsICJwaW4iOiAiMTIzNDU2In0=",
        updatedAt: "2026-05-28T10:00:00.000Z"
    )
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
            eventName: eventName,
            accessPin: accessPin,
            qrData: qrData,
            updatedAt: payload["updatedAt"] as? String ?? ISO8601DateFormatter().string(from: Date())
        )
    }
}
