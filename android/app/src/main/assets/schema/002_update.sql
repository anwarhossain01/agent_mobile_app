ALTER TABLE orders
ADD COLUMN note TEXT;

ALTER TABLE server_orders
ADD COLUMN note TEXT;

ALTER TABLE server_orders
ADD COLUMN last_message TEXT;