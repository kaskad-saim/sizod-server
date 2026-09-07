import { ErrorMessage as KitErrorMessage, type ErrorMessageProps } from '@sorbent/ui-kit';

// текст ошибки по умолчанию для СИЗОД
const ErrorMessage = (props: ErrorMessageProps) => <KitErrorMessage text="Ошибка получения данных" {...props} />;

export default ErrorMessage;
