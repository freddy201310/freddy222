package com.haven.kids

import java.net.InetAddress
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

class DnsTest {
    @Test
    fun parsesAQuery() {
        val raw = Dns.query("WWW.Example.com", 0x1234)
        val q = assertNotNull(Dns.parseQuery(raw))
        assertEquals(0x1234, q.id)
        assertEquals("www.example.com", q.name)
        assertEquals(Dns.TYPE_A, q.type)
        assertEquals(raw.size, q.questionEnd)
    }

    @Test
    fun rejectsResponsesAndGarbage() {
        val resp = Dns.answer(Dns.parseQuery(Dns.query("a.com", 1))!!, emptyList())
        assertNull(Dns.parseQuery(resp))
        assertNull(Dns.parseQuery(ByteArray(5)))
    }

    @Test
    fun answersRoundTrip() {
        val q = Dns.parseQuery(Dns.query("forcesafesearch.google.com", 7))!!
        val ip = InetAddress.getByName("216.239.38.120")
        val resp = Dns.answer(q, listOf(ip, InetAddress.getByName("::1")))
        assertEquals(7, Dns.u16(resp, 0))
        assertEquals(0x80, resp[2].toInt() and 0x80) // it's a response
        assertEquals(1, Dns.u16(resp, 6)) // only the IPv4 address fits an A query
        assertEquals(listOf(ip), Dns.addresses(resp, Dns.TYPE_A))
    }

    @Test
    fun blockedAnswersPointNowhere() {
        val a = Dns.parseQuery(Dns.query("casino.example", 1, Dns.TYPE_A))!!
        assertEquals(listOf(InetAddress.getByName("0.0.0.0")), Dns.addresses(Dns.blocked(a), Dns.TYPE_A))
        val aaaa = Dns.parseQuery(Dns.query("casino.example", 1, Dns.TYPE_AAAA))!!
        assertEquals(listOf(InetAddress.getByName("::")), Dns.addresses(Dns.blocked(aaaa), Dns.TYPE_AAAA))
    }

    @Test
    fun wrapsRepliesInValidIpv4Udp() {
        val query = Dns.query("example.com", 9)
        // The query a phone app sent to the filter: 10.111.0.2:5555 → 10.111.0.1:53
        val udpIn = Dns.Udp(byteArrayOf(10, 111, 0, 2), byteArrayOf(10, 111, 0, 1), 5555, 53, query)
        val packet = Dns.reply(udpIn, query)
        // The reply goes back the other way: 10.111.0.1:53 → 10.111.0.2:5555
        val parsed = assertNotNull(Dns.parseUdp(packet, packet.size))
        assertContentEquals(byteArrayOf(10, 111, 0, 1), parsed.src)
        assertContentEquals(byteArrayOf(10, 111, 0, 2), parsed.dst)
        assertEquals(53, parsed.srcPort)
        assertEquals(5555, parsed.dstPort)
        assertContentEquals(query, parsed.payload)
        assertEquals(0, Dns.checksum(packet, 0, 20)) // a correct header checksums to zero
    }

    @Test
    fun domainMatchingIncludesSubdomainsOnly() {
        assertEquals(true, Dns.matches("m.example.com", "example.com"))
        assertEquals(true, Dns.matches("example.com", "example.com"))
        assertEquals(false, Dns.matches("notexample.com", "example.com"))
    }
}
