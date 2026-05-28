package com.stagandhen.watch

/*
 * Future integration sketch:
 *
 * Phone app:
 * - Build payload with mobile/src/utils/watchPayload.js.
 * - Send it through the Wearable Data Layer at path /event_invite.
 *
 * Wear app:
 * - Listen for DataClient updates.
 * - Decode the JSON payload into WatchInvitePayload.
 * - Render WatchInviteScreen(payload).
 *
 * Keep this as a sketch until the Android native/Wear module is created.
 */
object WearDataLayerPaths {
    const val EVENT_INVITE = "/event_invite"
    const val SECRET_MISSION = "/secret_mission"
    const val POINTS_LEADERBOARD = "/points_leaderboard"
    const val PARTY_COUNTDOWN = "/party_countdown"
}
