import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "simple-create-lwc.createLWC",
    async (uri: vscode.Uri) => {
      try {
        // Step 1: Determine the target directory
        let targetDir: string;
        if (uri && uri.fsPath) {
          targetDir = uri.fsPath; // Directory selected from the file explorer
        } else if (vscode.window.activeTextEditor) {
          targetDir = path.dirname(
            vscode.window.activeTextEditor.document.uri.fsPath
          );
        } else if (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath) {
          targetDir = vscode.workspace.workspaceFolders[0].uri.fsPath; // Fallback to the top-level folder
        } else {
          vscode.window.showErrorMessage("No target directory found.");
          return;
        }

        // Step 2: Prompt for the component name
        const rawName = await vscode.window.showInputBox({
          prompt:
            "Enter the name of the new Lightning Web Component (PascalCase, camelCase, or kebab-case)",
          validateInput: (value) => {
            const validNameRegex = /^[a-zA-Z][a-zA-Z0-9-]*$/;
            return validNameRegex.test(value)
              ? null
              : "Component name must start with a letter and contain only letters, numbers, or hyphens.";
          },
        });

        if (!rawName) {
          return; // User canceled the input
        }

        // Step 3: Normalize the name
        const normalizedName = normalizeComponentName(rawName);
        const camelCaseName = normalizedName.camelCase;
        const pascalCaseName = normalizedName.pascalCase;

        // Step 4: Ask which files to create
        const fileOptions = await vscode.window.showQuickPick(
          ["JS", "HTML", "CSS"].map((label) => ({
            label,
            picked: label !== "CSS",
          })),
          {
            canPickMany: true,
            placeHolder: "Select the files to create for the component.",
          }
        );

        if (!fileOptions || fileOptions.length === 0) {
          return; // User canceled or deselected everything
        }

        // Step 5: Create the component directory
        const componentDir = path.join(targetDir, camelCaseName);
        if (!fs.existsSync(componentDir)) {
          fs.mkdirSync(componentDir);
        }

        // Step 6: Create the files
        fileOptions.forEach((file) => {
          const filePath = path.join(
            componentDir,
            `${camelCaseName}.${file.label.toLowerCase()}`
          );
          if (file.label === "JS") {
            fs.writeFileSync(
              filePath,
              `import { LightningElement } from 'lwc';\n\nexport default class ${pascalCaseName} extends LightningElement {}`
            );
          } else if (file.label === "HTML") {
            fs.writeFileSync(filePath, "<template>\n\n</template>");
          } else if (file.label === "CSS") {
            fs.writeFileSync(filePath, "");
          }
        });

        vscode.window.showInformationMessage(
          `LWC component '${camelCaseName}' created in '${componentDir}'.`
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Error creating LWC: ${errorMessage}`);
      }
    }
  );

  context.subscriptions.push(disposable);
}

// Helper function to normalize component names
function normalizeComponentName(name: string): {
  camelCase: string;
  pascalCase: string;
} {
  // Convert kebab-case or camelCase/PascalCase to camelCase
  const camelCase = name
    .replace(/-([a-z])/g, (_, char) => char.toUpperCase()) // Handle kebab-case
    .replace(/^([A-Z])/, (_, char) => char.toLowerCase()); // Handle PascalCase to camelCase

  // Convert camelCase to PascalCase
  const pascalCase = camelCase[0].toUpperCase() + camelCase.slice(1);

  return { camelCase, pascalCase };
}

export function deactivate() {}
