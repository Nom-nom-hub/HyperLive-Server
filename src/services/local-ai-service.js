"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalAIService = void 0;
const hyperserver_ai_model_1 = require("./hyperserver-ai-model");
class LocalAIService {
    constructor(context, outputChannel) {
        this.modelManager = new hyperserver_ai_model_1.HyperServerAIModelManager(context, outputChannel);
        this.outputChannel = outputChannel;
    }
    async analyzeCode(code, task) {
        this.outputChannel.appendLine('🔍 Starting local code analysis...');
        
        if (task === 'error-analysis') {
            return this.analyzeErrorIntelligently(code);
        } else if (task === 'code-improvements') {
            return this.suggestIntelligentImprovements(code);
        }
        
        // Fallback to basic tools for other tasks
        let toolId = 'eslint'; // default
        if (task === 'code-improvements') {
            toolId = 'prettier';
        }
        
        try {
            const result = await this.modelManager.analyzeCodeWithTool(toolId, code, task);
            this.outputChannel.appendLine('✅ Local code analysis completed');
            return result;
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Local code analysis failed: ${error}`);
            return 'Local analysis failed. Please try again.';
        }
    }

    analyzeErrorIntelligently(errorMessage) {
        this.outputChannel.appendLine('🤖 Performing intelligent error analysis...');
        
        // Common error patterns and their solutions
        const errorPatterns = {
            'TypeError: Cannot read property': {
                explanation: 'This error occurs when you try to access a property on an undefined or null value.',
                commonCauses: [
                    'Accessing object properties before the object is initialized',
                    'Trying to access array elements that don\'t exist',
                    'DOM elements not found in the page'
                ],
                solutions: [
                    'Add null checks before accessing properties',
                    'Use optional chaining (?.) for safer property access',
                    'Ensure the object/array is properly initialized',
                    'Check if DOM elements exist before accessing them'
                ],
                example: '// Instead of: obj.property\n// Use: obj?.property or if (obj) obj.property'
            },
            'ReferenceError:': {
                explanation: 'This error occurs when you try to use a variable that hasn\'t been declared.',
                commonCauses: [
                    'Misspelled variable names',
                    'Using variables before they\'re declared',
                    'Variables declared in different scopes'
                ],
                solutions: [
                    'Check for typos in variable names',
                    'Ensure variables are declared before use',
                    'Use let/const instead of var for better scoping',
                    'Check if variables are in the correct scope'
                ],
                example: '// Make sure to declare: let myVar = value;'
            },
            'SyntaxError:': {
                explanation: 'This error occurs when there\'s a syntax problem in your code.',
                commonCauses: [
                    'Missing brackets, parentheses, or semicolons',
                    'Invalid JavaScript syntax',
                    'Unclosed strings or comments'
                ],
                solutions: [
                    'Check for missing closing brackets/parentheses',
                    'Verify all strings are properly closed',
                    'Use a linter to catch syntax errors',
                    'Check for proper semicolon usage'
                ],
                example: '// Check for: missing }, ), or "'
            },
            'Cannot find module': {
                explanation: 'This error occurs when Node.js can\'t find a required module.',
                commonCauses: [
                    'Module not installed (missing npm install)',
                    'Incorrect import/require path',
                    'Module name typo'
                ],
                solutions: [
                    'Run npm install to install missing dependencies',
                    'Check the import/require path is correct',
                    'Verify the module name is spelled correctly',
                    'Check if the module exists in package.json'
                ],
                example: '// Run: npm install module-name'
            }
        };

        // Find matching error pattern
        for (const [pattern, analysis] of Object.entries(errorPatterns)) {
            if (errorMessage.includes(pattern)) {
                return `Error Analysis Results:

🔍 Error Type: ${pattern}
📝 Explanation: ${analysis.explanation}

🚨 Common Causes:
${analysis.commonCauses.map(cause => `• ${cause}`).join('\n')}

✅ Recommended Solutions:
${analysis.solutions.map(solution => `• ${solution}`).join('\n')}

💡 Example Fix:
${analysis.example}

🎯 Next Steps:
1. Identify which cause applies to your situation
2. Apply the relevant solution
3. Test your code to ensure the error is resolved
4. Consider adding error handling for similar cases`;
            }
        }

        // Generic error analysis if no pattern matches
        return `Error Analysis Results:

🔍 Error Message: ${errorMessage}
📝 General Analysis: This appears to be a runtime error in your code.

🚨 Common Debugging Steps:
• Check the browser console for additional error details
• Look at the line number mentioned in the error
• Verify all variables are properly declared and initialized
• Check for typos in function or variable names
• Ensure all required dependencies are loaded

✅ General Solutions:
• Add console.log() statements to debug variable values
• Use try-catch blocks for error handling
• Check if all required files are properly linked
• Verify the code runs in the correct order

💡 Debugging Tip:
Add this code to help debug:
console.log('Debug info:', { /* your variables here */ });`;
    }

    suggestIntelligentImprovements(code) {
        this.outputChannel.appendLine('🤖 Analyzing code for intelligent improvements...');
        
        const improvements = [];
        const suggestions = [];

        // Analyze code patterns and suggest improvements
        if (code.includes('var ')) {
            suggestions.push({
                issue: 'Using var instead of let/const',
                explanation: 'var has function scope and can lead to unexpected behavior',
                fix: 'Replace var with let (for variables that change) or const (for constants)',
                example: '// Instead of: var x = 1;\n// Use: const x = 1; or let x = 1;'
            });
        }

        if (code.includes('==') && !code.includes('===')) {
            suggestions.push({
                issue: 'Using loose equality (==)',
                explanation: '== performs type coercion which can lead to unexpected results',
                fix: 'Use strict equality (===) for more predictable comparisons',
                example: '// Instead of: if (x == 5)\n// Use: if (x === 5)'
            });
        }

        if (code.includes('function(') && !code.includes('=>')) {
            suggestions.push({
                issue: 'Using function keyword instead of arrow functions',
                explanation: 'Arrow functions are more concise and have lexical this binding',
                fix: 'Consider using arrow functions for shorter, cleaner code',
                example: '// Instead of: function(x) { return x * 2; }\n// Use: x => x * 2'
            });
        }

        if (code.includes('document.getElementById') && !code.includes('querySelector')) {
            suggestions.push({
                issue: 'Using getElementById instead of querySelector',
                explanation: 'querySelector is more flexible and can use CSS selectors',
                fix: 'Use querySelector for more powerful element selection',
                example: '// Instead of: document.getElementById("myId")\n// Use: document.querySelector("#myId")'
            });
        }

        if (code.includes('innerHTML') && !code.includes('textContent')) {
            suggestions.push({
                issue: 'Using innerHTML for text content',
                explanation: 'innerHTML can be a security risk and is slower for text',
                fix: 'Use textContent for plain text, innerHTML only when you need HTML',
                example: '// Instead of: element.innerHTML = "text"\n// Use: element.textContent = "text"'
            });
        }

        if (suggestions.length === 0) {
            return `Code Analysis Results:

✅ Your code looks good! No major issues found.

💡 General Best Practices:
• Use const and let instead of var
• Use strict equality (===) for comparisons
• Consider arrow functions for concise code
• Use textContent instead of innerHTML for plain text
• Add error handling where appropriate
• Use meaningful variable and function names`;
        }

        return `Code Analysis Results:

🔍 Found ${suggestions.length} potential improvements:

${suggestions.map((suggestion, index) => `
${index + 1}. ${suggestion.issue}
   📝 ${suggestion.explanation}
   🔧 ${suggestion.fix}
   💡 Example: ${suggestion.example}
`).join('\n')}

🎯 Implementation Priority:
1. High: Security and performance issues
2. Medium: Code quality and maintainability
3. Low: Style and preference improvements

💡 Next Steps:
• Review each suggestion and apply the ones that make sense for your project
• Test your code after making changes
• Consider using a linter to catch these issues automatically`;
    }
    async analyzeAccessibility(html) {
        this.outputChannel.appendLine('♿ Starting accessibility analysis...');
        try {
            const result = await this.modelManager.analyzeCodeWithTool('axe-core', html, 'accessibility');
            this.outputChannel.appendLine('✅ Accessibility analysis completed');
            return result;
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Accessibility analysis failed: ${error}`);
            return 'Accessibility analysis failed. Please try again.';
        }
    }
    async analyzePerformance(html) {
        this.outputChannel.appendLine('⚡ Starting performance analysis...');
        try {
            const result = await this.modelManager.analyzeCodeWithTool('lighthouse', html, 'performance');
            this.outputChannel.appendLine('✅ Performance analysis completed');
            return result;
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Performance analysis failed: ${error}`);
            return 'Performance analysis failed. Please try again.';
        }
    }
    async analyzeSEO(html) {
        this.outputChannel.appendLine('🔍 Starting SEO analysis...');
        try {
            const result = await this.modelManager.analyzeCodeWithTool('seo-checker', html, 'seo');
            this.outputChannel.appendLine('✅ SEO analysis completed');
            return result;
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ SEO analysis failed: ${error}`);
            return 'SEO analysis failed. Please try again.';
        }
    }
    async securityScan(code) {
        this.outputChannel.appendLine('🔒 Starting security scan...');
        try {
            const result = await this.modelManager.analyzeCodeWithTool('security-scanner', code, 'security');
            this.outputChannel.appendLine('✅ Security scan completed');
            return result;
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Security scan failed: ${error}`);
            return 'Security scan failed. Please try again.';
        }
    }
    async formatCode(code) {
        this.outputChannel.appendLine('🎨 Starting code formatting...');
        try {
            const result = await this.modelManager.analyzeCodeWithTool('prettier', code, 'formatting');
            this.outputChannel.appendLine('✅ Code formatting completed');
            return result;
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Code formatting failed: ${error}`);
            return 'Code formatting failed. Please try again.';
        }
    }
    // Tool management methods
    async getAvailableTools() {
        return this.modelManager.getAvailableTools();
    }
    async getToolStatus(toolId) {
        return this.modelManager.getToolStatus(toolId);
    }
    async ensureToolAvailable(toolId) {
        return this.modelManager.ensureToolAvailable(toolId);
    }
}
exports.LocalAIService = LocalAIService;
//# sourceMappingURL=local-ai-service.js.map