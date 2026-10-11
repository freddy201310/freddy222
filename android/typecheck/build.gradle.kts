plugins {
    kotlin("jvm") version "2.0.21"
}

repositories { mavenCentral() }

val androidJar = (findProperty("androidJar") as String?)
    ?: System.getenv("ANDROID_HOME")?.let { "$it/platforms/android-34/android.jar" }
    ?: error("Pass -PandroidJar=/path/to/android.jar")

kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }
java { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }

sourceSets {
    main { kotlin.srcDir("../app/src/main/java") }
}

dependencies {
    compileOnly(files(androidJar))
    testImplementation(kotlin("test"))
}

tasks.test { useJUnitPlatform() }
