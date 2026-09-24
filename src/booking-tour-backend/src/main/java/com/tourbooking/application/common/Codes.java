package com.tourbooking.application.common;

import java.security.SecureRandom;

/** Sinh mã hiển thị cho khách: không có ký tự dễ nhầm (0/O, 1/I/L). */
public final class Codes {
    private static final String ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
    private static final SecureRandom RANDOM = new SecureRandom();

    private Codes() {}

    public static String random(String prefix, int length) {
        StringBuilder sb = new StringBuilder(prefix);
        for (int i = 0; i < length; i++) sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        return sb.toString();
    }
}
