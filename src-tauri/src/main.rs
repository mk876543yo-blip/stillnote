#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let new_note = MenuItemBuilder::with_id("new-note", "New note")
                .accelerator("Ctrl+N")
                .build(app)?;
            let browse_notes = MenuItemBuilder::with_id("browse-notes", "Browse notes")
                .accelerator("Ctrl+K")
                .build(app)?;
            let settings = MenuItemBuilder::with_id("settings", "Settings").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit Stillnote")
                .accelerator("Ctrl+Q")
                .build(app)?;
            let about = MenuItemBuilder::with_id("about", "About Stillnote").build(app)?;

            let file_menu = SubmenuBuilder::new(app, "File")
                .item(&new_note)
                .item(&browse_notes)
                .item(&settings)
                .separator()
                .item(&quit)
                .build()?;
            let edit_menu = SubmenuBuilder::new(app, "Edit")
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;
            let help_menu = SubmenuBuilder::new(app, "Help").item(&about).build()?;
            let menu = MenuBuilder::new(app)
                .items(&[&file_menu, &edit_menu, &help_menu])
                .build()?;
            app.set_menu(menu)?;

            app.on_menu_event(|app, event| {
                let Some(window) = app.get_webview_window("main") else {
                    return;
                };

                let script = match event.id().0.as_str() {
                    "new-note" => "document.getElementById('new-note-button')?.click()",
                    "browse-notes" => "document.getElementById('search-open')?.click()",
                    "settings" => "document.getElementById('settings-button')?.click()",
                    "about" => {
                        "window.alert('Stillnote — private notes and study, saved on this device.')"
                    }
                    "quit" => {
                        let _ = window.close();
                        return;
                    }
                    _ => return,
                };
                let _ = window.eval(script);
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Stillnote");
}
