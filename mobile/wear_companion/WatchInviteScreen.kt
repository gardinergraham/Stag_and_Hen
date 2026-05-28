package com.stagandhen.watch

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text

@Composable
fun WatchInviteScreen(
    payload: WatchInvitePayload?,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black),
        contentAlignment = Alignment.Center
    ) {
        if (payload == null) {
            EmptyInviteState()
        } else {
            InviteContent(payload = payload)
        }
    }
}

@Composable
private fun InviteContent(payload: WatchInvitePayload) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 10.dp, vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Crew Join QR",
            color = Color(0xFFFF1493),
            style = MaterialTheme.typography.caption1,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = payload.eventName,
            color = Color.White,
            style = MaterialTheme.typography.caption2,
            textAlign = TextAlign.Center,
            maxLines = 2
        )

        Spacer(modifier = Modifier.height(8.dp))

        QrCodePlaceholder()

        Spacer(modifier = Modifier.height(6.dp))

        Text(
            text = "PIN",
            color = Color.Gray,
            style = MaterialTheme.typography.caption3
        )
        Text(
            text = payload.accessPin,
            color = Color.White,
            style = MaterialTheme.typography.title3,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = "Scan to join",
            color = Color.Gray,
            style = MaterialTheme.typography.caption3
        )
    }
}

@Composable
private fun QrCodePlaceholder() {
    Box(
        modifier = Modifier
            .size(112.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(Color.White),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "QR",
            color = Color.Black,
            style = MaterialTheme.typography.title2,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
private fun EmptyInviteState() {
    Text(
        modifier = Modifier.padding(18.dp),
        text = "Open the phone app to send an event QR.",
        color = Color.Gray,
        style = MaterialTheme.typography.caption1,
        textAlign = TextAlign.Center
    )
}
