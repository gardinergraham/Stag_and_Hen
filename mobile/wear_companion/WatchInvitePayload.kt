package com.stagandhen.watch

import kotlinx.serialization.Serializable

@Serializable
data class WatchInvitePayload(
    val eventName: String,
    val accessPin: String,
    val qrData: String,
    val updatedAt: String
) {
    companion object {
        val preview = WatchInvitePayload(
            eventName = "Sophie's Hen Weekend",
            accessPin = "123456",
            qrData = "stagandhen://join?data=eyJhcHAiOiAic3RhZ2FuZGhlbiIsICJ2ZXJzaW9uIjogMSwgImV2ZW50X2lkIjogInByZXZpZXciLCAiZXZlbnRfbmFtZSI6ICJTb3BoaWUncyBIZW4gV2Vla2VuZCIsICJwaW4iOiAiMTIzNDU2In0=",
            updatedAt = "2026-05-28T10:00:00.000Z"
        )
    }
}
