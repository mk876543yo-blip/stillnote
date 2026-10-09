import org.gradle.api.tasks.Copy

plugins {
    id("com.android.application")
}

val generatedWebAssets = layout.buildDirectory.dir("generated/assets")
val copyWebAssets by tasks.registering(Copy::class) {
    from(rootProject.projectDir.parentFile) {
        include("index.html", "styles.css", "app.js", "manifest.webmanifest", "service-worker.js", "icon.svg")
    }
    into(generatedWebAssets.map { it.dir("www") })
}

android {
    namespace = "org.stillnote.mobile"
    compileSdk = 36

    defaultConfig {
        applicationId = "org.stillnote.mobile"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    // AGP 9 requires a concrete source directory here. The task dependency below
    // keeps this generated assets directory populated before Android packaging.
    sourceSets.getByName("main").assets.srcDir(generatedWebAssets.get().asFile)
}

tasks.named("preBuild").configure {
    dependsOn(copyWebAssets)
}

dependencies {
    implementation("androidx.webkit:webkit:1.15.0")
}
